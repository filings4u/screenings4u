/* screenings4u — Admin Manual Testing Order
 *
 * Front-end for manual testing orders.
 * IMPORTANT: order creation/payment must be performed by a
 * Supabase Edge Function so the browser never becomes the
 * authoritative source for price, payment, order creation,
 * invitations, or account provisioning.
 */
"use strict";

const MANUAL_TESTING_ORDER_FUNCTION = "create-manual-testing-order";
const STRIPE_PUBLISHABLE_KEY = window.SCREENINGS4U_STRIPE_PUBLISHABLE_KEY || "";
let adminClient = null;
let stripe = null;
let elements = null;
let paymentElement = null;
let paymentMounted = false;
let selectedCustomer = null;
let products = [];

document.addEventListener("DOMContentLoaded", initManualTestingOrder);

async function initManualTestingOrder(){
  adminClient = getSupabaseClient();
  if(!adminClient){ showMessage("Supabase could not be initialized.","error"); return; }

  bindControls();
  await Promise.all([loadTestingProducts(), loadInitialCustomers()]);
}

function getSupabaseClient(){
  if(typeof window.getScreenings4uSupabase === "function") return window.getScreenings4uSupabase();
  if(window.screenings4uSupabase) return window.screenings4uSupabase;
  if(window.supabase && window.SCREENINGS4U_SUPABASE_URL && window.SCREENINGS4U_SUPABASE_ANON_KEY){
    window.screenings4uSupabase = window.supabase.createClient(
      window.SCREENINGS4U_SUPABASE_URL,
      window.SCREENINGS4U_SUPABASE_ANON_KEY,
      {auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}}
    );
    return window.screenings4uSupabase;
  }
  return null;
}

function bindControls(){
  const form=document.getElementById("manualTestingOrderForm");
  const product=document.getElementById("productSelect");
  const search=document.getElementById("customerSearch");
  const clear=document.getElementById("clearCustomer");

  form?.addEventListener("submit", createOrder);
  product?.addEventListener("change", updateSummary);
  search?.addEventListener("input", debounce(searchCustomers,250));
  clear?.addEventListener("click", clearSelectedCustomer);

  document.querySelectorAll('input[name="paymentMode"]').forEach(input=>{
    input.addEventListener("change", togglePaymentMode);
  });

  ["firstName","lastName","email"].forEach(id=>{
    document.getElementById(id)?.addEventListener("input", updateSummary);
  });
}

async function loadTestingProducts(){
  const select=document.getElementById("productSelect");
  try{
    const {data,error}=await adminClient.from("products").select("*").order("name",{ascending:true});
    if(error) throw error;

    products=(data||[]).filter(isTestingProduct);
    select.innerHTML='<option value="">Select a testing service...</option>'+
      products.map(p=>`<option value="${escapeAttr(p.id)}">${escapeHtml(productName(p))} — ${formatMoney(productPrice(p))}</option>`).join("");

    if(!products.length) select.innerHTML='<option value="">No testing products found</option>';
    updateSummary();
  }catch(error){
    console.error(error);
    select.innerHTML='<option value="">Unable to load testing services</option>';
    showMessage("Unable to load testing services from the product catalog.","error");
  }
}

function isTestingProduct(product){
  // Training products are explicitly linked to lms_courses.
  if(product.training_course_id) return false;
  const text=[product.name,product.product_name,product.title,product.category,product.product_type,product.type]
    .filter(Boolean).join(" ").toLowerCase();
  return /drug|alcohol|dot|testing|screen|collector|urine|hair|panel/.test(text);
}

async function loadInitialCustomers(){
  // No customer list is rendered until the admin searches.
  const search=document.getElementById("customerSearch");
  search?.setAttribute("placeholder","Search name or email...");
}

async function searchCustomers(){
  const input=document.getElementById("customerSearch");
  const results=document.getElementById("customerResults");
  const term=(input?.value||"").trim();

  if(term.length<2){ results.hidden=true; results.innerHTML=""; return; }

  const safe=term.replace(/[%_]/g,"");
  try{
    const {data,error}=await adminClient.from("client_profiles")
      .select("*")
      .or(`email.ilike.%${safe}%,first_name.ilike.%${safe}%,last_name.ilike.%${safe}%`)
      .limit(8);
    if(error) throw error;

    results.innerHTML=(data||[]).map(customer=>{
      const name=customerName(customer);
      const email=customer.email||"";
      return `<button type="button" class="customer-result" data-customer-id="${escapeAttr(customer.id)}">
        <strong>${escapeHtml(name)}</strong><small>${escapeHtml(email)}</small>
      </button>`;
    }).join("") || '<div class="customer-result"><strong>No matching customers</strong></div>';

    results.hidden=false;
    results.querySelectorAll("[data-customer-id]").forEach(button=>{
      button.addEventListener("click",()=>selectCustomer(button.dataset.customerId,data||[]));
    });
  }catch(error){
    console.error(error);
    showMessage("Unable to search customers.","error");
  }
}

function selectCustomer(id,list){
  selectedCustomer=list.find(item=>String(item.id)===String(id));
  if(!selectedCustomer) return;

  setValue("firstName",selectedCustomer.first_name||"");
  setValue("lastName",selectedCustomer.last_name||"");
  setValue("email",selectedCustomer.email||"");
  setValue("phone",selectedCustomer.phone||"");
  setValue("address",selectedCustomer.address||selectedCustomer.billing_address||"");
  setValue("city",selectedCustomer.city||"");
  setValue("state",selectedCustomer.state||"");
  setValue("zip",selectedCustomer.zip||selectedCustomer.postal_code||"");

  const box=document.getElementById("selectedCustomer");
  box.hidden=false;
  box.innerHTML=`<div><strong>${escapeHtml(customerName(selectedCustomer))}</strong><small>${escapeHtml(selectedCustomer.email||"Existing customer")}</small></div>`;
  document.getElementById("customerResults").hidden=true;
  updateSummary();
}

function clearSelectedCustomer(){
  selectedCustomer=null;
  ["firstName","lastName","email","phone","address","city","state","zip"].forEach(id=>setValue(id,""));
  document.getElementById("selectedCustomer").hidden=true;
  document.getElementById("customerSearch").value="";
  updateSummary();
}

function togglePaymentMode(){
  const mode=document.querySelector('input[name="paymentMode"]:checked')?.value||"pay";
  const panel=document.getElementById("stripePaymentPanel");
  const status=document.getElementById("summaryPayment");
  panel.hidden=mode!=="pay";
  status.textContent=mode==="pay"?"Payment required":"Free / comped — no payment";
  if(mode==="pay") mountPaymentElement();
}

async function mountPaymentElement(){
  if(paymentMounted) return;
  if(!STRIPE_PUBLISHABLE_KEY){
    // Backend wiring can provide the key through config. Do not hard-code secrets.
    return;
  }
  if(typeof Stripe!=="function") return;

  try{
    stripe=Stripe(STRIPE_PUBLISHABLE_KEY);
    // A PaymentIntent/client secret must come from the manual-order Edge Function.
    // We intentionally do not create a PaymentIntent from the browser.
  }catch(error){ console.error(error); }
}

async function createOrder(event){
  event.preventDefault();
  clearMessage();

  const button=document.getElementById("createOrderButton");
  const product=products.find(p=>String(p.id)===String(document.getElementById("productSelect").value));
  const mode=document.querySelector('input[name="paymentMode"]:checked')?.value||"pay";

  if(!product){ showMessage("Select a testing service first.","error"); return; }

  const customer={
    userId:selectedCustomer?.id||null,
    firstName:value("firstName"),
    lastName:value("lastName"),
    email:value("email"),
    phone:value("phone"),
    address:value("address"),
    city:value("city"),
    state:value("state"),
    zip:value("zip")
  };

  if(!customer.firstName||!customer.lastName||!customer.email){
    showMessage("First name, last name, and email are required.","error"); return;
  }

  button.disabled=true;
  button.textContent=mode==="pay"?"Preparing Secure Payment...":"Creating Free Order...";

  try{
    const {data,error}=await adminClient.functions.invoke(MANUAL_TESTING_ORDER_FUNCTION,{
      body:{
        orderType:"testing",
        paymentMode:mode,
        productId:product.id,
        customer
      }
    });
    if(error) throw error;

    if(mode==="pay"){
      if(!data?.clientSecret) throw new Error("The secure payment server did not return a client secret.");
      await finishStripePayment(data.clientSecret,customer);
    }else{
      showMessage("Testing order created and customer access/invite processing has been started.","success");
      button.textContent="Order Created";
    }
  }catch(error){
    console.error("Manual testing order error:",error);
    showMessage(error.message||"Unable to create the testing order.","error");
    button.disabled=false;
    button.textContent="Create Testing Order";
  }
}

async function finishStripePayment(clientSecret,customer){
  if(!stripe) throw new Error("Stripe is not configured for this admin page.");

  if(!elements){
    elements=stripe.elements({clientSecret,appearance:{
      theme:"stripe",
      variables:{colorPrimary:"#325aa3",colorText:"#172033",borderRadius:"8px",fontFamily:"Inter, Arial, sans-serif"}
    }});
    paymentElement=elements.create("payment");
    paymentElement.mount("#payment-element");
    paymentMounted=true;
  }

  const {error}=await stripe.confirmPayment({
    elements,
    confirmParams:{
      payment_method_data:{billing_details:{
        name:`${customer.firstName} ${customer.lastName}`.trim(),
        email:customer.email,phone:customer.phone,
        address:{line1:customer.address,city:customer.city,state:customer.state,postal_code:customer.zip}
      }},
      return_url:window.location.origin+"/admin-orders.html"
    },
    redirect:"if_required"
  });
  if(error) throw error;

  showMessage("Payment submitted. The webhook will finalize the order, invite the customer, and update the admin records.","success");
  document.getElementById("createOrderButton").textContent="Payment Submitted";
}

function updateSummary(){
  const product=products.find(p=>String(p.id)===String(document.getElementById("productSelect").value));
  const name=[value("firstName"),value("lastName")].filter(Boolean).join(" ");
  setText("summaryCustomer",name||"—");
  setText("summaryProduct",product?productName(product):"—");
  setText("summaryTotal",product?formatMoney(productPrice(product)):"$0.00");
  const description=document.getElementById("productDescription");
  if(description) description.textContent=product?(product.description||product.short_description||"Testing service selected."): "";
}

function productName(p){return p.name||p.product_name||p.title||"Testing Service"}
function productPrice(p){return Number(p.price??p.amount??p.total??0)}
function customerName(c){return [c.first_name,c.last_name].filter(Boolean).join(" ")||c.email||"Customer"}
function formatMoney(n){return Number(n||0).toLocaleString("en-US",{style:"currency",currency:"USD"})}
function value(id){return String(document.getElementById(id)?.value||"").trim()}
function setValue(id,v){const el=document.getElementById(id);if(el)el.value=v}
function setText(id,v){const el=document.getElementById(id);if(el)el.textContent=v}
function showMessage(message,type){const box=document.getElementById("formMessage");if(!box)return;box.className=`form-message ${type||""}`;box.textContent=message}
function clearMessage(){const box=document.getElementById("formMessage");if(box){box.className="form-message";box.textContent=""}}
function escapeHtml(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}
function escapeAttr(v){return escapeHtml(v)}
function debounce(fn,wait){let timer;return(...args)=>{clearTimeout(timer);timer=setTimeout(()=>fn(...args),wait)}}
