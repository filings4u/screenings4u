/* Screenings4U multi-test checkout: customer/billing only; donor assignments occur in portal. */
(()=>{'use strict';
const KEY='s4u_market_saved_tests_v1',QTY='s4u_market_test_quantities_v1';
const $=id=>document.getElementById(id),money=(v,c='USD')=>new Intl.NumberFormat('en-US',{style:'currency',currency:c}).format(v);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const json=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
const ids=json(KEY,[]),quantities=json(QTY,{}),selected=[...new Set(Array.isArray(ids)?ids:[])];
const qty=id=>Math.max(1,Math.min(50,Math.floor(Number(quantities[id])||1)));
let services=[],stripe=null,elements=null,clientSecret=null,lock=false,serverOrder=null;
const message=(v,isError=true)=>{const el=$('paymentError');if(el){el.textContent=v;el.style.display=v?'block':'none';el.style.color=isError?'#b91c1c':'#1b6b43'}};
const button=(label,disabled=false)=>{const b=$('payButton');if(b){b.textContent=label;b.disabled=disabled}};
const format=svc=>money((Number(svc.price)||0)/100,svc.currency||'USD');
async function init(){
try{
 if(typeof ensureServiceCatalogLoaded==='function')await ensureServiceCatalogLoaded();
 if(typeof refreshTestingCatalog==='function')await refreshTestingCatalog();
 if(typeof getTestService!=='function')throw Error('Testing catalog is unavailable.');
 if(!selected.length)throw Error('Your cart is empty. Add a test to continue.');
 services=selected.map(id=>getTestService(id));
 if(services.some(s=>!s||s.orderType!=='checkout'||!(Number(s.price)>0)))throw Error('Your cart contains a test that is no longer available. Please review your cart.');
 if(services.some(s=>(s.currency||'USD')!==(services[0].currency||'USD')))throw Error('Tests in different currencies cannot be purchased together.');
 const units=services.reduce((x,s)=>x+qty(s.id),0);if(units<2){window.location.replace('checkout.html?service='+encodeURIComponent(services[0].id));return}
 $('loading').style.display='none';$('checkoutGrid').style.display='grid';
 $('labcorpDonorSection').style.display='none';$('labcorpDonorSection').querySelectorAll('input,select,textarea').forEach(el=>{el.required=false;el.disabled=true});
 $('category').textContent=units+' purchased tests';$('product').textContent='Your complete testing cart';
 $('features').parentElement.querySelector('.label').textContent='Tests included in this order';
 $('features').innerHTML='';$('drugs').innerHTML='';$('drugs').style.display='none';$('drugs').previousElementSibling.style.display='none';
 const rows=document.createElement('div');rows.className='cart-checkout-lines';rows.id='cartCheckoutLines';
 services.forEach(s=>{const row=document.createElement('div');row.className='cart-checkout-line';row.innerHTML='<div><strong>'+esc(s.name)+'</strong><small>Qty '+qty(s.id)+' · '+esc(s.specimen||s.category||'Drug testing')+'</small></div><div class="cart-line-cost"><strong>'+money(Number(s.price)*qty(s.id)/100,s.currency||'USD')+'</strong><small>'+format(s)+' each</small></div>';rows.append(row)});
 $('features').before(rows);$('features').style.display='none';
 const subtotal=services.reduce((a,s)=>a+Number(s.price)*qty(s.id)/100,0),currency=services[0].currency||'USD';
 $('price').textContent=money(subtotal,currency);$('discountSubtotal').textContent=money(subtotal,currency);$('discountTotal').textContent=money(subtotal,currency);
 $('discountRow').style.display='none';
 const note=document.createElement('div');note.className='checkout-deferred-notice';note.textContent='You can purchase all '+units+' tests now and assign each test to a donor later in your Screenings4U Customer Portal. Each donor pass is prepared individually after the required donor information has been submitted.';
 $('checkoutForm').prepend(note);
 document.querySelector('.checkout-heading .intro').textContent='Review every test in your cart, enter customer billing details and pay once. Donors can be assigned in your account after purchase.';
 document.querySelector('.checkout-summary-header p').textContent='Review all purchased tests and the combined order total.';
 document.querySelector('#backLink').href='cart.html';
 $('applyDiscountButton').onclick=()=>{if(lock)return; const v=$('discountCode').value.trim();$('discountMessage').textContent=v?'Your discount will be verified against every test when secure payment is prepared.':'Enter a discount code.'};
 $('checkoutForm').addEventListener('submit',pay);
 button('Continue to secure payment →');
}catch(e){$('loading').style.display='none';$('errorCard').style.display='block';$('errorCard').querySelector('.notice').textContent=e.message;}
}
async function pay(event){
 event.preventDefault();if(lock)return;
 if(!$('checkoutForm').reportValidity())return;
 lock=true;button('Preparing secure payment…',true);message('');
 try{
 if(!clientSecret){
 const body={items:services.map(s=>({serviceId:s.id,quantity:qty(s.id)})),discountCode:$('discountCode').value.trim(),customer:Object.fromEntries(['firstName','lastName','email','phone','address','address2','city','state','zip'].map(k=>[k,$(k).value.trim()]))};
 const base=window.SCREENINGS4U_SUPABASE_URL;if(!base)throw Error('Payment service is not configured.');
 const res=await fetch(base.replace(/\/+$/,'')+'/functions/v1/create-cart-payment-intent',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await res.json().catch(()=>({}));if(!res.ok)throw Error(data.error||'Unable to prepare payment.');
 if(!data.clientSecret||!data.stripePublishableKey)throw Error('Payment provider did not return the required configuration.');
 if(typeof Stripe!=='function')throw Error('Stripe payment service did not load.');
 clientSecret=data.clientSecret;serverOrder=data;stripe=Stripe(data.stripePublishableKey);
 elements=stripe.elements({clientSecret,appearance:{theme:'stripe',variables:{colorPrimary:'#325aa3',fontFamily:'Inter, sans-serif'}}});
 elements.create('payment',{layout:'tabs'}).mount('#payment-element');
 $('paymentSection').style.display='block';$('paymentSection').setAttribute('aria-hidden','false');
 $('discountSubtotal').textContent=money(data.subtotal,data.currency||'USD');$('discountTotal').textContent=money(data.total,data.currency||'USD');$('price').textContent=money(data.subtotal,data.currency||'USD');
 if(data.discountAmount>0){$('discountRow').style.display='flex';$('discountAmount').textContent='-'+money(data.discountAmount,data.currency||'USD');$('discountLabel').textContent='Discount ('+esc(data.discountCode)+')'}
 $('checkoutForm').querySelectorAll('input,select').forEach(i=>{if(i.id!=='payButton'&&i.id!=='discountCode')i.readOnly=true});$('discountCode').disabled=true;$('applyDiscountButton').disabled=true;
 button('Pay '+money(data.total,data.currency||'USD')+' securely →');
 $('paymentSection').scrollIntoView({behavior:'smooth',block:'center'});
 }else{
 const result=await stripe.confirmPayment({elements,confirmParams:{return_url:new URL('order-confirmation.html?cart=1&order_id='+encodeURIComponent(serverOrder.orderId),location.href).toString()},redirect:'if_required'});
 if(result.error)throw Error(result.error.message||'Payment could not be confirmed.');
 if(result.paymentIntent?.status==='succeeded'||result.paymentIntent?.status==='processing'){
 const url='order-confirmation.html?cart=1&order_id='+encodeURIComponent(serverOrder.orderId)+'&payment_intent='+encodeURIComponent(result.paymentIntent.id);location.assign(url);return}
 message('Payment status: '+(result.paymentIntent?.status||'Awaiting confirmation')+'. Please check your order before attempting another payment.',false);
 }
 }catch(e){message(e.message||'Unable to process payment.');if(!clientSecret)button('Continue to secure payment →')}
 finally{lock=false;$('payButton').disabled=false}
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
