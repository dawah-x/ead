(() => {
  "use strict";

  const body = document.body;
  const params = new URLSearchParams(window.location.search);
  const rawType = (params.get("type") || params.get("t") || "qa").toLowerCase();
  const type = rawType.startsWith("f") ? "fatwa" : "qa";
  const query = (params.get("q") || params.get("title") || "").trim();

  body.dataset.page = type === "fatwa" ? "fatwa" : "qa";

  const WHATSAPP = "8801783543026";
  const LABELS = {
    qa: { kicker: "প্রশ্নোত্তর · জবাব", back: "← প্রশ্নোত্তর সূচি", href: "questions.html", noun: "প্রশ্নোত্তর" },
    fatwa: { kicker: "ফতোয়া · মাসআলা", back: "← ফতোয়া সূচি", href: "fatwa.html", noun: "ফতোয়া" }
  };
  const label = LABELS[type];

  const bn = (value) =>
    String(value).replace(/[0-9]/g, (digit) => "০১২৩৪৫৬৭৮৯"[digit]);

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const byId = (id) => document.getElementById(id);
  const nodes = {
    back: byId("ans-back"),
    kicker: byId("ans-kicker"),
    title: byId("ans-title"),
    summary: byId("ans-summary"),
    meta: byId("ans-meta"),
    loading: byId("ans-loading"),
    state: byId("ans-state"),
    content: byId("ans-body"),
    disclaimer: byId("ans-disclaimer"),
    wa: byId("ans-wa"),
    copy: byId("ans-copy"),
    share: byId("ans-share"),
    live: byId("ans-live"),
    more: byId("ans-more"),
    related: byId("ans-related")
  };

  if (nodes.back) {
    nodes.back.href = label.href;
    nodes.back.textContent = label.back;
  }
  if (nodes.kicker) nodes.kicker.textContent = label.kicker;

  const waHref = (text) =>
    "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(text);

  const askText = () =>
    query
      ? "আসসালামু আলাইকুম। DAWAH X-এ “" + query + "” — এই বিষয়ে জানতে চাই।"
      : "আসসালামু আলাইকুম। DAWAH X-এর প্রশ্নোত্তর সম্পর্কে জানতে চাই।";

  const setLive = (message) => {
    if (!nodes.live) return;
    nodes.live.textContent = "";
    window.setTimeout(() => {
      nodes.live.textContent = message;
    }, 30);
  };

  const show = (node, visible) => {
    if (node) node.hidden = !visible;
  };

  const setLoading = (loading) => {
    show(nodes.loading, loading);
    if (loading) {
      show(nodes.state, false);
      show(nodes.content, false);
    }
  };

  const resetMeta = () => {
    if (!nodes.meta) return;
    nodes.meta.replaceChildren();
    nodes.meta.hidden = true;
  };

  const addMeta = (text) => {
    if (!nodes.meta) return;
    nodes.meta.appendChild(el("span", "answer-meta-item", text));
    nodes.meta.hidden = false;
  };

  const renderBody = (build) => {
    if (!nodes.content) return;
    nodes.content.replaceChildren();
    build(nodes.content);
    show(nodes.content, true);
    show(nodes.state, false);
    show(nodes.loading, false);
  };

  const renderState = (tone, heading, message, extra) => {
    if (!nodes.state) return;
    nodes.state.replaceChildren();
    nodes.state.dataset.tone = tone;
    nodes.state.appendChild(el("b", "answer-state-title", heading));
    nodes.state.appendChild(el("p", "answer-state-text", message));
    if (extra) nodes.state.appendChild(extra);
    show(nodes.state, true);
    show(nodes.content, false);
    show(nodes.loading, false);
  };

  const actionLink = (href, text, className) => {
    const link = el("a", className || "answer-btn ghost", text);
    link.href = href;
    return link;
  };

  const renderRelated = (data, entry, canonical) => {
    if (!nodes.more || !nodes.related) return;
    const library = (data && data[type]) || {};
    const items = Object.keys(library)
      .filter((title) => title !== query && title !== canonical)
      .slice(0, 4);
    if (!items.length) {
      nodes.more.hidden = true;
      return;
    }
    nodes.related.replaceChildren();
    items.forEach((title) => {
      const card = actionLink(
        "answers.html?type=" + type + "&q=" + encodeURIComponent(title),
        "",
        "qcard answer-related-card"
      );
      card.appendChild(el("small", null, label.noun));
      card.appendChild(el("b", null, title));
      card.appendChild(el("span", null, (entry ? "উত্তর পড়ুন" : "দেখুন") + " ›"));
      nodes.related.appendChild(card);
    });
    nodes.more.hidden = false;
  };

  const renderEntry = (entry, data, canonical) => {
    resetMeta();
    if (entry.summary) nodes.summary.textContent = entry.summary;
    if (typeof entry.read === "number") addMeta(bn(entry.read) + " মিনিট পাঠ");
    if (Array.isArray(entry.refs) && entry.refs.length) {
      addMeta(bn(entry.refs.length) + "টি রেফারেন্স");
    }
    addMeta(label.noun);

    renderBody((root) => {
      (entry.sections || []).forEach((section) => {
        const block = el("div", "answer-section");
        if (section.h) block.appendChild(el("h2", null, section.h));
        if (section.p) block.appendChild(el("p", null, section.p));
        root.appendChild(block);
      });

      if (Array.isArray(entry.refs) && entry.refs.length) {
        const refs = el("div", "answer-section answer-refs");
        refs.appendChild(el("h2", null, "উল্লেখিত আয়াত ও সূত্র"));
        const list = el("ul");
        entry.refs.forEach((ref) => list.appendChild(el("li", null, ref)));
        refs.appendChild(list);
        root.appendChild(refs);
      }

      if (entry.credit) {
        root.appendChild(el("p", "answer-credit", entry.credit));
      }
    });

    if (nodes.disclaimer && data && data.disclaimer) {
      nodes.disclaimer.textContent = data.disclaimer;
    }
    if (nodes.wa) nodes.wa.href = waHref(askText());
    renderRelated(data, entry, canonical);
  };

  const renderPending = (data, canonical) => {
    resetMeta();
    addMeta("সূচি থেকে নির্বাচিত");
    addMeta(label.noun);
    nodes.summary.textContent =
      "এই প্রশ্নটি আমাদের সূচিতে রয়েছে। এর বিস্তারিত লিখিত উত্তর এখন যাচাই ও সম্পাদনার পর্যায়ে আছে।";

    const wa = actionLink(waHref(askText()), "WhatsApp-এ প্রশ্নটি পাঠান", "answer-btn wa");
    wa.setAttribute("rel", "noopener");
    wa.setAttribute("target", "_blank");

    renderState(
      "pending",
      "লিখিত উত্তর প্রস্তুত হচ্ছে",
      "প্রশ্নটি কুরআন ও সুন্নাহর মূলনীতির আলোকে বিচার্য। আপনার পরিস্থিতি ও প্রেক্ষাপট জানিয়ে পাঠালে আমাদের টিম সহায়তা করবে। উত্তর যুক্ত হলে এই পৃষ্ঠাতেই দেখা যাবে।",
      wa
    );
    if (nodes.disclaimer && data && data.disclaimer) {
      nodes.disclaimer.textContent = data.disclaimer;
    }
    if (nodes.wa) nodes.wa.href = waHref(askText());
    renderRelated(data, null, canonical);
  };

  const renderEmpty = () => {
    resetMeta();
    if (nodes.title) nodes.title.textContent = "কোন প্রশ্ন বেছে নিন";
    nodes.summary.textContent =
      "প্রশ্নোত্তর বা ফতোয়া সূচি থেকে যেকোনো কার্ডে চাপ দিলে তার লিখিত উত্তর এখানেই খুলবে।";

    const links = el("div", "answer-state-links");
    links.appendChild(actionLink("questions.html", "প্রশ্নোত্তর সূচি", "answer-btn"));
    links.appendChild(actionLink("fatwa.html", "ফতোয়া সূচি", "answer-btn ghost"));
    links.appendChild(
      actionLink(
        waHref("আসসালামু আলাইকুম। DAWAH X-এ একটি প্রশ্নের উত্তর জানতে চাই।"),
        "WhatsApp-এ জিজ্ঞাসা করুন",
        "answer-btn wa"
      )
    );

    renderState(
      "empty",
      "উত্তর পড়তে একটি প্রশ্ন বেছে নিন",
      "সূচির প্রতিটি কার্ড এখন সাইটের ভেতরেই উত্তর খোলে—নতুন ট্যাবে বাইরের কোনো সাইটে যেতে হবে না।",
      links
    );
    show(nodes.more, false);
  };

  const renderError = () => {
    resetMeta();
    if (nodes.title) nodes.title.textContent = query || "উত্তর লোড করা যায়নি";
    nodes.summary.textContent =
      "উত্তর লাইব্রেরি লোড করা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।";

    const actions = el("div", "answer-state-links");
    const retry = el("button", "answer-btn", "আবার চেষ্টা করুন");
    retry.type = "button";
    retry.addEventListener("click", () => load());
    actions.appendChild(retry);
    actions.appendChild(
      actionLink(waHref(askText()), "WhatsApp-এ জিজ্ঞাসা করুন", "answer-btn wa")
    );

    renderState(
      "error",
      "সংযোগে সমস্যা হয়েছে",
      "উত্তর ফাইলটি এখন পাওয়া যাচ্ছে না। আপনি চাইলে প্রশ্নটি সরাসরি WhatsApp-এ পাঠাতে পারেন।",
      actions
    );
    show(nodes.more, false);
  };

  const copyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setLive("লিংক কপি হয়েছে।");
      return;
    } catch (error) {
      try {
        const area = document.createElement("textarea");
        area.value = url;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        const copied = document.execCommand("copy");
        area.remove();
        setLive(copied ? "লিংক কপি হয়েছে।" : "লিংক কপি করা যায়নি।");
      } catch (fallbackError) {
        setLive("লিংক কপি করা যায়নি।");
      }
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          text: query || "DAWAH X — প্রশ্নোত্তর",
          url: window.location.href
        });
        return;
      } catch (error) {
        if (error && error.name === "AbortError") return;
      }
    }
    copyLink();
  };

  if (nodes.copy) nodes.copy.addEventListener("click", copyLink);
  if (nodes.share) nodes.share.addEventListener("click", share);

  const render = (data) => {
    resetMeta();
    if (!query) {
      renderEmpty();
      return;
    }
    const library = (data && data[type]) || {};
    const aliases = (data && data.aliases && data.aliases[type]) || {};
    const canonical = aliases[query] || query;
    const entry = library[canonical];
    document.title = query + " — DAWAH X";
    if (nodes.title) nodes.title.textContent = query;
    if (entry) renderEntry(entry, data, canonical);
    else renderPending(data, canonical);
  };

  const load = async () => {
    setLoading(true);
    if (nodes.title && query) nodes.title.textContent = query;
    if (nodes.summary) {
      nodes.summary.textContent = "একটু অপেক্ষা করুন, উত্তর লোড হচ্ছে।";
    }
    try {
      const response = await fetch("app/answers.json", { cache: "no-cache" });
      if (!response.ok) throw new Error("answers unavailable");
      const data = await response.json();
      render(data);
    } catch (error) {
      renderError();
    }
  };

  load();
})();
