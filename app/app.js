(() => {
  "use strict";

  const body = document.body;
  if (!body) return;

  document.documentElement.classList.add("app-js");

  const page = body.dataset.page || "";
  const pageToTab = {
    home: "home",
    qa: "questions",
    fatwa: "fatwa",
    videos: "videos",
    about: "more",
    services: "more",
    ask: "more",
    contact: "more"
  };
  const currentTab = pageToTab[page] || "";

  document.querySelectorAll(".app-tab, .app-more-link").forEach((link) => {
    const isTab = link.classList.contains("app-tab");
    const isCurrent = isTab
      ? link.dataset.tab === currentTab
      : link.dataset.pageLink === page;
    if (isCurrent) link.setAttribute("aria-current", "page");
  });

  let toastHost = null;
  const ensureToastHost = () => {
    if (toastHost) return toastHost;
    toastHost = document.createElement("div");
    toastHost.className = "app-toasts";
    toastHost.setAttribute("role", "status");
    toastHost.setAttribute("aria-live", "polite");
    document.body.appendChild(toastHost);
    return toastHost;
  };

  const toast = (message, options = {}) => {
    const host = ensureToastHost();
    const item = document.createElement("div");
    item.className = "app-toast";
    if (options.tone) item.dataset.tone = options.tone;

    const text = document.createElement("span");
    text.textContent = message;
    item.appendChild(text);

    let timer = 0;
    const dismiss = () => {
      window.clearTimeout(timer);
      item.remove();
    };

    if (options.action) {
      const action = document.createElement("button");
      action.type = "button";
      action.textContent = options.action;
      action.addEventListener("click", () => {
        dismiss();
        if (typeof options.onAction === "function") options.onAction();
      });
      item.appendChild(action);
    }

    host.appendChild(item);
    while (host.children.length > 3) host.firstElementChild.remove();
    if (!options.persist) {
      timer = window.setTimeout(dismiss, options.duration || 4500);
    }
  };

  const sheet = document.getElementById("app-more");
  const moreButton = document.getElementById("app-more-btn");

  if (sheet && moreButton) {
    const openSheet = () => {
      try {
        sheet.showModal();
      } catch (error) {
        sheet.setAttribute("open", "");
      }
      moreButton.setAttribute("aria-expanded", "true");
      body.classList.add("app-sheet-open");
    };

    const closeSheet = () => {
      if (sheet.open) sheet.close();
      else sheet.removeAttribute("open");
      moreButton.setAttribute("aria-expanded", "false");
      body.classList.remove("app-sheet-open");
    };

    moreButton.addEventListener("click", () => {
      openSheet();
      const firstClose = sheet.querySelector("[data-app-close]");
      if (sheet.open && firstClose) firstClose.focus({ preventScroll: true });
    });

    sheet.querySelectorAll("[data-app-close]").forEach((button) => {
      button.addEventListener("click", closeSheet);
    });

    sheet.addEventListener("click", (event) => {
      if (event.target === sheet) closeSheet();
    });

    sheet.addEventListener("close", () => {
      moreButton.setAttribute("aria-expanded", "false");
      body.classList.remove("app-sheet-open");
    });

    sheet.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeSheet();
    });

    sheet.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => closeSheet());
    });

    window.addEventListener("pageshow", (event) => {
      if (event.persisted && sheet.open) closeSheet();
    });
  }

  const installCard = document.getElementById("app-install");
  const installButton = document.getElementById("app-install-btn");
  const installNote = document.getElementById("app-install-note");
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const embedded = (() => {
    try {
      return window.self !== window.top;
    } catch (error) {
      return true;
    }
  })();

  let installPrompt = null;
  let installBusy = false;

  const showInstall = (note, label) => {
    if (!installCard || standalone) return;
    if (note && installNote) installNote.textContent = note;
    if (label && installButton) installButton.textContent = label;
    installCard.hidden = false;
  };

  const setInstallNote = (text) => {
    if (installNote) installNote.textContent = text;
  };

  const resetInstallButton = () => {
    if (!installButton) return;
    installButton.disabled = false;
    installButton.hidden = false;
    installButton.removeAttribute("aria-busy");
    installButton.textContent = "ইনস্টল";
  };

  const runInstall = async () => {
    if (installBusy) return;
    if (!installPrompt && embedded) {
      setInstallNote("নতুন ট্যাবে খোলা হয়েছে — সেখানে ইনস্টল করুন।");
      window.open(window.location.href, "_blank", "noopener");
      return;
    }
    if (!installPrompt) {
      setInstallNote(
        isIOS
          ? "Safari → Share → Add to Home Screen চাপুন।"
          : "ব্রাউজার মেনু → Add to Home Screen বেছে নিন।"
      );
      return;
    }

    installBusy = true;
    if (installButton) {
      installButton.disabled = true;
      installButton.setAttribute("aria-busy", "true");
      installButton.textContent = "ইনস্টল হচ্ছে…";
    }
    setInstallNote("ইনস্টল শুরু হচ্ছে…");

    try {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice && choice.outcome === "accepted") {
        setInstallNote("অ্যাপ ইনস্টল হয়েছে — হোম স্ক্রিন থেকে খুলুন।");
        if (installButton) installButton.hidden = true;
      } else {
        setInstallNote("ইনস্টল বাতিল হয়েছে। আবার চেষ্টা করতে পারেন।");
      }
    } catch (error) {
      setInstallNote(
        "ইনস্টল করা যায়নি — ব্রাউজার মেনু → Add to Home Screen ব্যবহার করুন।"
      );
    } finally {
      installPrompt = null;
      installBusy = false;
      if (installButton && !installButton.hidden) resetInstallButton();
    }
  };

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    showInstall("হোম স্ক্রিনে যোগ করে দ্রুত ও অফলাইনে পড়ুন।", "ইনস্টল");
  });

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    setInstallNote("অ্যাপ ইনস্টল হয়েছে — হোম স্ক্রিন থেকে খুলুন।");
    if (installButton) installButton.hidden = true;
  });

  if (installButton) installButton.addEventListener("click", runInstall);
  if (embedded && !standalone) {
    showInstall("ইনস্টল করতে অ্যাপটি নতুন ট্যাবে খুলুন।", "নতুন ট্যাবে");
  } else if (isIOS && !standalone) {
    showInstall("Safari-তে Share → Add to Home Screen বেছে নিন।", "কীভাবে?");
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
      try {
        const registration = await navigator.serviceWorker.register("sw.js", {
          scope: "./",
          updateViaCache: "none"
        });

        const offerUpdate = () => {
          if (!registration.waiting || !navigator.serviceWorker.controller) return;
          toast("নতুন সংস্করণ পাওয়া গেছে", {
            action: "রিফ্রেশ",
            persist: true,
            onAction: () => {
              registration.waiting.postMessage({ type: "SKIP_WAITING" });
              navigator.serviceWorker.addEventListener(
                "controllerchange",
                () => window.location.reload(),
                { once: true }
              );
            }
          });
        };

        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed") offerUpdate();
          });
        });

        offerUpdate();
      } catch (error) {
        return;
      }
    });
  }

  window.addEventListener("offline", () => {
    toast("আপনি অফলাইনে আছেন — সংরক্ষিত কনটেন্ট দেখানো হচ্ছে।", {
      tone: "error"
    });
  });

  window.addEventListener("online", () => {
    toast("আবার অনলাইনে আছেন", { tone: "success" });
  });
})();
