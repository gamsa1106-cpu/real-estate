const PAGE_SIZE = 12;
let allData = [];
let filtered = [];
let currentPage = 1;
let cityFilter  = "전체";
let typeFilter  = "전체";
let priceMin    = 0;
let priceMax    = 999999;
let sortMode    = "date";
let searchQ     = "";

function getPrice(d) {
  return d.type === "매매" ? (d.price || 0) : (d.deposit || 0);
}

function dateNum(d) {
  const y   = String(d.year  || 0);
  const m   = String(d.month || 0).padStart(2, "0");
  const day = String(d.day   || 0).padStart(2, "0");
  return parseInt(y + m + day) || 0;
}

function fmtPrice(won) {
  if (!won) return "-";
  if (won >= 10000) {
    const uk   = Math.floor(won / 10000);
    const rest = won % 10000;
    return rest ? `${uk}억 ${rest.toLocaleString()}만` : `${uk}억`;
  }
  return `${won.toLocaleString()}만`;
}

function applyFilters() {
  filtered = allData.filter(d => {
    if (cityFilter !== "전체" && d.city !== cityFilter) return false;
    if (typeFilter !== "전체" && d.type !== typeFilter) return false;
    const p = getPrice(d);
    if (p < priceMin || p > priceMax) return false;
    if (searchQ && !d.apt.includes(searchQ)) return false;
    return true;
  });

  filtered.sort((a, b) => {
    if (sortMode === "date")       return dateNum(b) - dateNum(a);
    if (sortMode === "price-desc") return getPrice(b) - getPrice(a);
    if (sortMode === "price-asc")  return getPrice(a) - getPrice(b);
    if (sortMode === "area-desc")  return (b.area || 0) - (a.area || 0);
    return 0;
  });

  currentPage = 1;
  renderCards();
  renderPagination();
  document.getElementById("result-count").textContent = `총 ${filtered.length}건`;
}

function renderStats() {
  const trades = allData.filter(d => d.type === "매매");
  const rents  = allData.filter(d => d.type === "전세");
  const avg    = arr => arr.length
    ? Math.round(arr.reduce((s, d) => s + getPrice(d), 0) / arr.length) : 0;
  const latest = allData.slice().sort((a, b) => dateNum(b) - dateNum(a))[0];

  document.getElementById("stat-total").textContent     = `${allData.length}건`;
  document.getElementById("stat-trade-avg").textContent = fmtPrice(avg(trades));
  document.getElementById("stat-rent-avg").textContent  = fmtPrice(avg(rents));
  document.getElementById("stat-latest").textContent    = latest
    ? `${latest.year}.${latest.month}.${latest.day}` : "-";
}

function renderCards() {
  const grid  = document.getElementById("card-grid");
  const start = (currentPage - 1) * PAGE_SIZE;
  const page  = filtered.slice(start, start + PAGE_SIZE);

  if (!page.length) {
    grid.innerHTML = '<div class="empty">검색 결과가 없습니다.</div>';
    return;
  }

  grid.innerHTML = page.map(d => {
    const isTrade    = d.type === "매매";
    const priceVal   = isTrade ? d.price : d.deposit;
    const priceLabel = isTrade ? "매매가" : "보증금";
    const naverUrl   = `https://new.land.naver.com/search?q=${encodeURIComponent(d.apt)}`;

    return `
      <div class="card ${isTrade ? "trade" : "rent"}" data-url="${naverUrl}">
        <div class="card-header">
          <span class="card-apt">${d.apt}</span>
          <span class="card-type ${isTrade ? "trade" : "rent"}">${d.type}</span>
        </div>
        <div class="card-price ${isTrade ? "" : "rent-price"}">
          ${priceLabel} ${fmtPrice(priceVal)}
        </div>
        <div class="card-meta">
          <div class="meta-item"><span class="meta-label">면적</span><span>${d.area}㎡</span></div>
          <div class="meta-item"><span class="meta-label">층</span><span>${d.floor}층</span></div>
          <div class="meta-item"><span class="meta-label">동</span><span>${d.dong}</span></div>
          <div class="meta-item"><span class="meta-label">건축</span><span>${d.built_year}년</span></div>
        </div>
        <div class="card-footer">
          <span>${d.city}</span>
          <span>${d.year}.${d.month}.${d.day}</span>
          <span class="naver-link">🔗 네이버 부동산</span>
        </div>
      </div>`;
  }).join("");

  // 카드 클릭 이벤트 (innerHTML 후 등록)
  grid.querySelectorAll(".card[data-url]").forEach(card => {
    card.addEventListener("click", () => {
      window.open(card.dataset.url, "_blank");
    });
  });
}

function renderPagination() {
  const total = Math.ceil(filtered.length / PAGE_SIZE);
  const pg    = document.getElementById("pagination");
  if (total <= 1) { pg.innerHTML = ""; return; }

  pg.innerHTML = Array.from({ length: total }, (_, i) => i + 1)
    .map(n => `<button class="${n === currentPage ? "active" : ""}" data-page="${n}">${n}</button>`)
    .join("");

  pg.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      currentPage = parseInt(btn.dataset.page);
      renderCards();
      renderPagination();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

function setActiveBtn(groupId, clickedBtn) {
  document.querySelectorAll(`#${groupId} button`).forEach(b => b.classList.remove("active"));
  clickedBtn.classList.add("active");
}

async function loadData() {
  try {
    const res  = await fetch("data/listings.json");
    const json = await res.json();
    allData = json.data || [];
    document.getElementById("updated").textContent =
      `마지막 업데이트: ${json.updated_at} · 총 ${json.total}건`;
    renderStats();
    applyFilters();
  } catch (e) {
    document.getElementById("updated").textContent = "데이터를 불러올 수 없습니다.";
    console.error(e);
  }
}

// 도시 필터
document.querySelectorAll("#filter-city button").forEach(btn => {
  btn.addEventListener("click", () => {
    setActiveBtn("filter-city", btn);
    cityFilter = btn.dataset.value;
    applyFilters();
  });
});

// 유형 필터
document.querySelectorAll("#filter-type button").forEach(btn => {
  btn.addEventListener("click", () => {
    setActiveBtn("filter-type", btn);
    typeFilter = btn.dataset.value;
    applyFilters();
  });
});

// 가격대 필터
document.querySelectorAll("#filter-price button").forEach(btn => {
  btn.addEventListener("click", () => {
    setActiveBtn("filter-price", btn);
    priceMin = parseInt(btn.dataset.min);
    priceMax = parseInt(btn.dataset.max);
    applyFilters();
  });
});

// 정렬
document.getElementById("sort-select").addEventListener("change", e => {
  sortMode = e.target.value;
  applyFilters();
});

// 검색
let searchTimer;
document.getElementById("search-input").addEventListener("input", e => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQ = e.target.value.trim();
    applyFilters();
  }, 300);
});

loadData();
