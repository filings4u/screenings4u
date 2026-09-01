(() => {
  "use strict";

  const TABLE = "blog_posts";
  const SELECT = "id,title,slug,excerpt,content,content_html,featured_image_url,category,tags,featured,seo_title,seo_description,author_name,published_at,created_at,updated_at";
  const state = { posts: [], category: "All", search: "" };
  const $ = id => document.getElementById(id);

  document.addEventListener("DOMContentLoaded", initializeBlog);

  async function initializeBlog() {
    try {
      const client = getClient();
      const slug = new URLSearchParams(location.search).get("slug")?.trim();
      if (slug) await loadArticle(client, slug);
      else await loadIndex(client);
    } catch (error) {
      console.error("[Public Blog]", error);
      showFatal(error?.message || "The blog is temporarily unavailable.");
    }
  }

  function getClient() {
    if (!window.supabase?.createClient) throw new Error("The blog service could not be loaded.");
    const url = window.SCREENINGS4U_SUPABASE_URL;
    const key = window.SCREENINGS4U_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("The blog connection is not configured.");
    return window.supabase.createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  }

  async function loadIndex(client) {
    const { data, error } = await client.from(TABLE).select(SELECT).eq("status", "published").eq("show_website", true).order("published_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
    if (error) throw error;
    state.posts = Array.isArray(data) ? data : [];
    $("blogLoading").hidden = true;
    bindIndexControls();
    renderCategories();
    renderIndex();
  }

  function bindIndexControls() {
    $("blogSearch")?.addEventListener("input", event => { state.search = event.target.value.trim().toLowerCase(); renderIndex(); });
  }

  function renderCategories() {
    const box = $("blogCategories");
    if (!box) return;
    const categories = ["All", ...new Set(state.posts.map(post => post.category?.trim()).filter(Boolean))];
    box.replaceChildren(...categories.map(category => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "category-button" + (category === state.category ? " active" : "");
      button.textContent = category;
      button.addEventListener("click", () => { state.category = category; renderCategories(); renderIndex(); });
      return button;
    }));
  }

  function renderIndex() {
    const filtered = state.posts.filter(post => {
      const categoryMatch = state.category === "All" || post.category === state.category;
      const haystack = [post.title, post.excerpt, post.category, ...(post.tags || [])].join(" ").toLowerCase();
      return categoryMatch && (!state.search || haystack.includes(state.search));
    });
    const featured = !state.search && state.category === "All" ? filtered.find(post => post.featured) : null;
    renderFeatured(featured);
    const rows = featured ? filtered.filter(post => post.id !== featured.id) : filtered;
    const grid = $("blogGrid");
    grid.replaceChildren(...rows.map(createCard));
    $("blogEmpty").hidden = Boolean(filtered.length);
  }

  function renderFeatured(post) {
    const box = $("blogFeatured");
    if (!post) { box.hidden = true; box.replaceChildren(); return; }
    box.hidden = false;
    const image = document.createElement("div");
    image.className = "featured-image";
    if (safeImage(post.featured_image_url)) image.style.backgroundImage = `url("${cssUrl(post.featured_image_url)}")`;
    const copy = document.createElement("div");
    copy.className = "featured-copy";
    copy.innerHTML = `<span class="post-category"></span><h2></h2><p></p><div class="post-meta"></div><a class="btn btn-orange" href="${postUrl(post)}">Read Article →</a>`;
    copy.querySelector(".post-category").textContent = post.category || "Featured";
    copy.querySelector("h2").textContent = post.title;
    copy.querySelector("p").textContent = post.excerpt || plainExcerpt(post);
    copy.querySelector(".post-meta").textContent = postMeta(post);
    box.replaceChildren(image, copy);
  }

  function createCard(post) {
    const card = document.createElement("article");
    card.className = "blog-card";
    const image = document.createElement("a");
    image.className = "card-image";
    image.href = postUrl(post);
    image.setAttribute("aria-label", `Read ${post.title}`);
    if (safeImage(post.featured_image_url)) image.style.backgroundImage = `url("${cssUrl(post.featured_image_url)}")`;
    const body = document.createElement("div");
    body.className = "card-body";
    body.innerHTML = `<span class="post-category"></span><h3></h3><p></p><div class="post-meta"></div><a class="read-link">Read Article →</a>`;
    body.querySelector(".post-category").textContent = post.category || "Insights";
    const titleLink = document.createElement("a"); titleLink.href = postUrl(post); titleLink.textContent = post.title;
    body.querySelector("h3").appendChild(titleLink);
    body.querySelector("p").textContent = post.excerpt || plainExcerpt(post);
    body.querySelector(".post-meta").textContent = postMeta(post);
    body.querySelector(".read-link").href = postUrl(post);
    card.append(image, body);
    return card;
  }

  async function loadArticle(client, slug) {
    $("blogListView").hidden = true;
    $("blogArticleView").hidden = false;
    let query = client.from(TABLE).select(SELECT).eq("status", "published").eq("show_website", true);
    query = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(slug)
      ? query.eq("id", slug)
      : query.eq("slug", slug);
    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    if (!data) throw new Error("This article was not found or is not published.");
    renderArticle(data);
  }

  function renderArticle(post) {
    $("articleLoading").hidden = true;
    $("blogArticle").hidden = false;
    $("articleCategory").textContent = post.category || "Resources & Insights";
    $("articleTitle").textContent = post.title;
    $("articleExcerpt").textContent = post.excerpt || "";
    $("articleExcerpt").hidden = !post.excerpt;
    $("articleMeta").textContent = postMeta(post);
    const image = $("articleImage");
    if (safeImage(post.featured_image_url)) { image.src = post.featured_image_url; image.alt = post.title; $("articleImageWrap").hidden = false; }
    const html = post.content_html || paragraphs(post.content || "");
    $("articleContent").innerHTML = sanitizeHtml(html);
    document.title = `${post.seo_title || post.title} | screenings4u`;
    updateMetaDescription(post.seo_description || post.excerpt || plainExcerpt(post));
  }

  function showFatal(message) {
    if (!$("blogListView")?.hidden) { $("blogLoading").hidden = true; $("blogError").textContent = message; $("blogError").hidden = false; }
    else { $("articleLoading").hidden = true; $("articleError").textContent = message; $("articleError").hidden = false; }
  }

  function postUrl(post) { return `blog.html?slug=${encodeURIComponent(post.slug || post.id)}`; }
  function postMeta(post) { return `${post.author_name || "screenings4u"} · ${formatDate(post.published_at || post.created_at)}`; }
  function formatDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(date); }
  function plainExcerpt(post) { return stripHtml(post.content_html || post.content || "").slice(0, 180).trim() + (stripHtml(post.content_html || post.content || "").length > 180 ? "…" : ""); }
  function stripHtml(value) { const div = document.createElement("div"); div.innerHTML = value; return div.textContent || ""; }
  function paragraphs(value) { return value.split(/\n{2,}/).filter(Boolean).map(part => `<p>${escapeHtml(part).replace(/\n/g, "<br>")}</p>`).join(""); }
  function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
  function safeImage(value) { try { const url = new URL(value, location.href); return ["http:", "https:"].includes(url.protocol); } catch { return false; } }
  function cssUrl(value) { return String(value).replace(/["\\\n\r]/g, ""); }
  function sanitizeHtml(html) {
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
    doc.querySelectorAll("script,style,iframe,object,embed,form,link,meta").forEach(node => node.remove());
    doc.querySelectorAll("*").forEach(node => [...node.attributes].forEach(attr => {
      const name = attr.name.toLowerCase(); const value = attr.value.trim().toLowerCase();
      if (name.startsWith("on") || ((name === "href" || name === "src") && value.startsWith("javascript:"))) node.removeAttribute(attr.name);
    }));
    return doc.body.firstElementChild?.innerHTML || "";
  }
  function updateMetaDescription(value) { let meta = document.querySelector('meta[name="description"]'); if (!meta) { meta = document.createElement("meta"); meta.name = "description"; document.head.appendChild(meta); } meta.content = String(value).slice(0, 160); }
})();
