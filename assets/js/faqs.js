(() => {
  "use strict";

  const state = {
    db: null,
    rows: [],
    category: "All",
    query: ""
  };

  const $ = (id) => document.getElementById(id);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeFaqs, {
      once: true
    });
  } else {
    initializeFaqs();
  }

  async function initializeFaqs() {
    bindSearch();

    try {
      state.db = await getPublicSupabaseClient();

      const { data, error } = await state.db
        .from("faqs")
        .select(
          "id,question,slug,answer_html,category,tags,sort_order,featured,updated_at"
        )
        .eq("status", "published")
        .eq("show_website", true)
        .order("sort_order", { ascending: true })
        .order("question", { ascending: true });

      if (error) {
        throw error;
      }

      state.rows = Array.isArray(data) ? data : [];

      renderCategories();
      renderFaqs();
      injectStructuredData();
    } catch (error) {
      console.error("[Public FAQs]", error);
      showFailure();
    }
  }

  async function getPublicSupabaseClient() {
    const directClient =
      window.supabaseClient ||
      window.S4USupabase?.client;

    if (directClient?.from) {
      return directClient;
    }

    if (typeof window.getScreenings4uSupabase !== "function") {
      throw new Error(
        "supabase-config.js did not expose getScreenings4uSupabase()."
      );
    }

    const timeout = new Promise((_, reject) => {
      window.setTimeout(() => {
        reject(
          new Error("The Supabase client took too long to initialize.")
        );
      }, 8000);
    });

    const client = await Promise.race([
      window.getScreenings4uSupabase(),
      timeout
    ]);

    if (!client?.from) {
      throw new Error("The public Supabase client is unavailable.");
    }

    return client;
  }

  function bindSearch() {
    const searchInput = $("faqSearch");

    if (!searchInput) {
      return;
    }

    searchInput.addEventListener("input", (event) => {
      state.query = String(event.target.value || "")
        .trim()
        .toLowerCase();

      renderFaqs();
    });
  }

  function renderCategories() {
    const target = $("faqCategories");

    if (!target) {
      return;
    }

    const categories = [
      "All",
      ...new Set(
        state.rows.map((row) => row.category || "General")
      )
    ];

    const buttons = categories.map((categoryName) => {
      const button = document.createElement("button");

      button.type = "button";
      button.className =
        "faqs-filter" +
        (categoryName === state.category ? " active" : "");

      button.textContent = categoryName;

      button.addEventListener("click", () => {
        state.category = categoryName;

        renderCategories();
        renderFaqs();
      });

      return button;
    });

    target.replaceChildren(...buttons);
  }

  function renderFaqs() {
    const target = $("faqList");
    const empty = $("faqEmpty");
    const loading = $("faqLoading");

    loading?.remove();

    if (!target) {
      return;
    }

    const rows = state.rows.filter((row) => {
      const rowCategory = row.category || "General";

      const categoryMatches =
        state.category === "All" ||
        rowCategory === state.category;

      const tags = Array.isArray(row.tags) ? row.tags : [];

      const searchText = [
        row.question || "",
        stripHtml(row.answer_html),
        rowCategory,
        ...tags
      ]
        .join(" ")
        .toLowerCase();

      return (
        categoryMatches &&
        (!state.query || searchText.includes(state.query))
      );
    });

    target
      .querySelectorAll(".faqs-item")
      .forEach((node) => node.remove());

    if (empty) {
      empty.hidden = rows.length > 0;
    }

    rows.forEach((row, index) => {
      const item = document.createElement("article");

      item.className = "faqs-item";

      if (row.slug) {
        item.id = row.slug;
      }

      const button = document.createElement("button");

      button.type = "button";
      button.className = "faqs-question";
      button.setAttribute("aria-expanded", "false");
      button.setAttribute(
        "aria-controls",
        `faqs-answer-${index}`
      );

      const copy = document.createElement("span");

      const category = document.createElement("small");
      category.textContent = row.category || "General";

      const question = document.createElement("strong");
      question.textContent = row.question || "Frequently asked question";

      copy.append(category, question);

      const icon = document.createElement("span");

      icon.className = "faqs-plus";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = "+";

      button.append(copy, icon);

      const answer = document.createElement("div");

      answer.className = "faqs-answer";
      answer.id = `faqs-answer-${index}`;
      answer.hidden = true;
      answer.append(sanitizeAnswer(row.answer_html));

      button.addEventListener("click", () => {
        const willOpen = answer.hidden;

        answer.hidden = !willOpen;
        button.setAttribute(
          "aria-expanded",
          String(willOpen)
        );

        item.classList.toggle("open", willOpen);
        icon.textContent = willOpen ? "−" : "+";
      });

      item.append(button, answer);
      target.appendChild(item);
    });
  }

  function sanitizeAnswer(html) {
    const template = document.createElement("template");

    template.innerHTML = String(html || "");

    const allowedElements = new Set([
      "P",
      "BR",
      "STRONG",
      "EM",
      "UL",
      "OL",
      "LI",
      "A"
    ]);

    const elements = [
      ...template.content.querySelectorAll("*")
    ];

    elements.forEach((node) => {
      if (!allowedElements.has(node.tagName)) {
        node.replaceWith(...node.childNodes);
        return;
      }

      [...node.attributes].forEach((attribute) => {
        const permitted =
          node.tagName === "A" &&
          ["href", "target", "rel"].includes(attribute.name);

        if (!permitted) {
          node.removeAttribute(attribute.name);
        }
      });

      if (node.tagName !== "A") {
        return;
      }

      const href = node.getAttribute("href") || "";

      const safeHref =
        /^(https?:|mailto:|tel:|[a-z0-9][a-z0-9-]*\.html(?:[#?].*)?|#)/i;

      if (!safeHref.test(href)) {
        node.removeAttribute("href");
      }

      if (node.getAttribute("target") === "_blank") {
        node.setAttribute("rel", "noopener noreferrer");
      }
    });

    return template.content;
  }

  function injectStructuredData() {
    document
      .getElementById("faqs-structured-data")
      ?.remove();

    const script = document.createElement("script");

    script.id = "faqs-structured-data";
    script.type = "application/ld+json";

    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: state.rows.map((row) => ({
        "@type": "Question",
        name: row.question || "",
        acceptedAnswer: {
          "@type": "Answer",
          text: stripHtml(row.answer_html)
        }
      }))
    });

    document.head.appendChild(script);
  }

  function stripHtml(value) {
    const element = document.createElement("div");

    element.innerHTML = String(value || "");

    return element.textContent || "";
  }

  function showFailure() {
    $("faqLoading")?.remove();

    const empty = $("faqEmpty");

    if (!empty) {
      return;
    }

    empty.hidden = false;

    const heading = empty.querySelector("strong");
    const message = empty.querySelector("p");

    if (heading) {
      heading.textContent =
        "FAQs are temporarily unavailable.";
    }

    if (message) {
      message.textContent =
        "Please contact our support team for assistance.";
    }
  }
})();