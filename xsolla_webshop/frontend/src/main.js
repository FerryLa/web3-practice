import { Widget } from "@xsolla/login-sdk";
import {
  clearToken,
  getToken,
  getTokenSummary,
  isExpired,
  readAuthCallback,
  saveToken,
} from "./auth.js";
import { fetchCatalog, MEMBER_SKU, normalizeItem, sortItems } from "./catalog.js";
import "./styles.css";

const config = {
  loginProjectId: import.meta.env.VITE_XSOLLA_LOGIN_PROJECT_ID?.trim() ?? "",
  catalogProjectId: import.meta.env.VITE_XSOLLA_CATALOG_PROJECT_ID?.trim() || "312439",
  callbackUrl:
    import.meta.env.VITE_XSOLLA_CALLBACK_URL?.trim() ||
    `${window.location.origin}/auth/callback`,
};

const app = document.querySelector("#app");
let widget = null;
let token = getToken();
let catalogRequest = null;
let callbackNotice = null;

function html() {
  app.innerHTML = `
    <header class="site-header">
      <a class="brand" href="/" aria-label="BLUC Store 홈">
        <span class="brand-mark">B</span>
        <span>BLUC Store</span>
      </a>
      <div class="auth-actions">
        <span class="session-chip" id="session-chip">게스트</span>
        <button class="button button-ghost" id="logout-button" type="button" hidden>로그아웃</button>
        <button class="button button-primary" id="login-button" type="button">Google로 로그인</button>
      </div>
    </header>

    <main>
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">DIRECT-TO-PLAYER WEB SHOP</p>
          <h1>더 많은 BLUC,<br /><span>로그인하면 더 특별하게.</span></h1>
          <p class="hero-description">
            Xsolla의 실제 카탈로그를 불러옵니다. 로그인한 회원에게는 사용자 속성에 맞는
            전용 패키지가 자동으로 추가됩니다.
          </p>
          <div class="hero-actions">
            <button class="button button-primary button-large" id="hero-login-button" type="button">
              회원 혜택 확인하기
            </button>
            <a class="text-link" href="#catalog">패키지 둘러보기 <span>↓</span></a>
          </div>
        </div>
        <div class="hero-art" aria-hidden="true">
          <div class="orbit orbit-one"></div>
          <div class="orbit orbit-two"></div>
          <div class="coin coin-back">B</div>
          <div class="coin coin-front">B</div>
          <div class="spark spark-one">✦</div>
          <div class="spark spark-two">✦</div>
        </div>
      </section>

      <section class="status-panel" id="status-panel" aria-live="polite">
        <div class="status-icon" id="status-icon">●</div>
        <div>
          <strong id="status-title">카탈로그 연결 중</strong>
          <p id="status-message">Xsolla Store API에서 최신 상품 정보를 가져오고 있습니다.</p>
        </div>
      </section>

      <section class="catalog-section" id="catalog">
        <div class="section-heading">
          <div>
            <p class="eyebrow">BLUC PACKAGES</p>
            <h2>필요한 만큼 충전하세요</h2>
          </div>
          <div class="catalog-meta">
            <span id="catalog-mode">공개 카탈로그</span>
            <span class="meta-divider"></span>
            <span id="item-count">0개 상품</span>
          </div>
        </div>
        <div class="catalog-grid" id="catalog-grid" aria-busy="true"></div>
      </section>

      <section class="how-it-works">
        <p class="eyebrow">HOW IT WORKS</p>
        <h2>로그인이 혜택으로 이어지는 과정</h2>
        <div class="steps">
          <article><span>01</span><h3>Xsolla 로그인</h3><p>Google 계정으로 안전하게 인증하고 JWT를 발급받습니다.</p></article>
          <article><span>02</span><h3>사용자 규칙 평가</h3><p>Xsolla가 <code>webshop_member</code> 속성을 기준으로 상품을 선별합니다.</p></article>
          <article><span>03</span><h3>개인화 상품 표시</h3><p>회원에게만 같은 가격의 1,200 BLUC 패키지를 추가로 보여줍니다.</p></article>
        </div>
      </section>
    </main>

    <footer>
      <span>CHAP 04 · Frontend Integration</span>
      <span>결제 기능은 아직 연결되지 않은 학습용 화면입니다.</span>
    </footer>
  `;
}

function setStatus(kind, title, message) {
  const panel = document.querySelector("#status-panel");
  panel.dataset.kind = kind;
  document.querySelector("#status-title").textContent = title;
  document.querySelector("#status-message").textContent = message;
}

function renderSession() {
  const loggedIn = Boolean(token);
  const summary = token ? getTokenSummary(token) : null;
  const chip = document.querySelector("#session-chip");
  const loginButton = document.querySelector("#login-button");
  const heroLoginButton = document.querySelector("#hero-login-button");
  const logoutButton = document.querySelector("#logout-button");

  chip.textContent = loggedIn ? "로그인됨" : "게스트";
  chip.dataset.loggedIn = String(loggedIn);
  chip.title = summary ? `사용자 ${summary.subject} · 만료 ${summary.expiresAt}` : "";
  loginButton.hidden = loggedIn;
  logoutButton.hidden = !loggedIn;
  heroLoginButton.textContent = loggedIn ? "회원 카탈로그 새로고침" : "회원 혜택 확인하기";
  document.querySelector("#catalog-mode").textContent = loggedIn
    ? "개인화 카탈로그"
    : "공개 카탈로그";
}

function createCard(rawItem, index) {
  const item = normalizeItem(rawItem);
  const article = document.createElement("article");
  article.className = `product-card${item.memberOnly ? " member-card" : ""}`;
  article.style.setProperty("--delay", `${index * 45}ms`);

  const badge = item.memberOnly
    ? '<span class="product-badge">MEMBER ONLY</span>'
    : index === 2
      ? '<span class="product-badge popular">POPULAR</span>'
      : "";

  article.innerHTML = `
    ${badge}
    <div class="product-visual">
      <img alt="" loading="lazy" />
    </div>
    <div class="product-body">
      <p class="product-sku"></p>
      <h3></h3>
      <p class="product-description"></p>
      <div class="product-footer">
        <strong class="product-price"></strong>
        <button class="buy-button" type="button" disabled>준비 중</button>
      </div>
    </div>
  `;

  const image = article.querySelector("img");
  image.src = item.imageUrl;
  image.alt = `${item.quantity.toLocaleString("ko-KR")} BLUC 패키지`;
  image.addEventListener("error", () => {
    image.hidden = true;
    image.parentElement.textContent = "B";
    image.parentElement.classList.add("image-fallback");
  });
  article.querySelector(".product-sku").textContent = item.sku;
  article.querySelector("h3").textContent = `${item.quantity.toLocaleString("ko-KR")} BLUC`;
  article.querySelector(".product-description").textContent = item.description;
  article.querySelector(".product-price").textContent = item.price;
  return article;
}

function renderCatalog(items) {
  const grid = document.querySelector("#catalog-grid");
  grid.replaceChildren(...sortItems(items).map(createCard));
  grid.setAttribute("aria-busy", "false");
  document.querySelector("#item-count").textContent = `${items.length}개 상품`;
}

async function loadCatalog() {
  catalogRequest?.abort();
  catalogRequest = new AbortController();
  const grid = document.querySelector("#catalog-grid");
  grid.setAttribute("aria-busy", "true");
  grid.innerHTML = '<div class="loading-card"><span></span><p>상품을 불러오는 중...</p></div>';

  try {
    const items = await fetchCatalog({
      projectId: config.catalogProjectId,
      token,
      signal: catalogRequest.signal,
    });
    renderCatalog(items);

    if (token) {
      const hasMemberItem = items.some((item) => item.sku === MEMBER_SKU);
      setStatus(
        hasMemberItem ? "success" : "warning",
        hasMemberItem ? "회원 전용 혜택이 적용됐습니다" : "로그인은 됐지만 회원 상품이 보이지 않습니다",
        hasMemberItem
          ? `개인화 카탈로그 ${items.length}개와 회원 전용 1,200 BLUC 상품을 확인했습니다.`
          : `JWT 요청은 성공했습니다. Xsolla 사용자 속성 webshop_member가 문자열 \"true\"인지 확인하세요.`,
      );
    } else {
      if (callbackNotice) {
        setStatus(callbackNotice.kind, callbackNotice.title, callbackNotice.message);
        callbackNotice = null;
      } else {
        setStatus(
          "neutral",
          "공개 카탈로그를 표시하고 있습니다",
          `비로그인 사용자에게 노출되는 기본 BLUC 패키지 ${items.length}개를 불러왔습니다.`,
        );
      }
    }
  } catch (error) {
    if (error.name === "AbortError") return;
    setStatus("error", "카탈로그를 불러오지 못했습니다", error.message);
    grid.innerHTML = '<div class="empty-state">잠시 후 다시 시도해 주세요.</div>';
    grid.setAttribute("aria-busy", "false");
  }
}

function openLogin() {
  if (token) {
    loadCatalog();
    document.querySelector("#catalog").scrollIntoView({ behavior: "smooth" });
    return;
  }

  if (!widget) {
    setStatus(
      "warning",
      "Login Project ID 설정이 필요합니다",
      "frontend/.env.local에 VITE_XSOLLA_LOGIN_PROJECT_ID를 입력한 뒤 개발 서버를 다시 시작하세요.",
    );
    return;
  }

  const container = document.querySelector("#xsolla-login-widget");
  container.style.display = "block";
  container.setAttribute("aria-hidden", "false");
  widget.open();
}

function initializeWidget() {
  if (!config.loginProjectId || config.loginProjectId === "YOUR_LOGIN_PROJECT_UUID") return;

  widget = new Widget({
    projectId: config.loginProjectId,
    callbackUrl: config.callbackUrl,
    preferredLocale: "ko_KR",
  });
  widget.mount("xsolla-login-widget");
  widget.on(widget.events.Close, () => {
    const container = document.querySelector("#xsolla-login-widget");
    container.style.display = "none";
    container.setAttribute("aria-hidden", "true");
  });
}

function handleCallback() {
  if (!["/auth/callback", "/auth/error"].includes(window.location.pathname)) return;

  const result = readAuthCallback();
  if (result.token) {
    saveToken(result.token);
    token = result.token;
  }

  history.replaceState({}, "", "/");

  if (result.error) {
    callbackNotice = {
      kind: "error",
      title: "로그인하지 못했습니다",
      message: result.errorDescription || result.error,
    };
  } else if (!result.token) {
    callbackNotice = {
      kind: "warning",
      title: "콜백에 JWT가 없습니다",
      message: "Xsolla Callback URL 설정과 로그인 응답 형식을 확인하세요.",
    };
  }
}

function bindEvents() {
  document.querySelector("#login-button").addEventListener("click", openLogin);
  document.querySelector("#hero-login-button").addEventListener("click", openLogin);
  document.querySelector("#logout-button").addEventListener("click", () => {
    clearToken();
    token = null;
    renderSession();
    loadCatalog();
  });
}

html();
handleCallback();

if (token && isExpired(token)) {
  clearToken();
  token = null;
  callbackNotice = {
    kind: "warning",
    title: "세션이 만료됐습니다",
    message: "다시 로그인하면 회원 카탈로그를 확인할 수 있습니다.",
  };
}

renderSession();
bindEvents();
initializeWidget();
loadCatalog();
