const speakerList = document.querySelector("#speakerList");
const searchInput = document.querySelector("#speakerSearch");
const yearFilter = document.querySelector("#yearFilter");
const prevPageButton = document.querySelector("#prevPage");
const nextPageButton = document.querySelector("#nextPage");
const pageInfo = document.querySelector("#pageInfo");
const tableRows = [...document.querySelectorAll(".speaker-table tbody tr[data-report-id]")];
let currentPage = 1;
const previousPageSize = 10;

const reportGroupLabels = {
  0: "Upcoming Talks",
  1: "Previous Talks",
  2: "Unscheduled Talks"
};

function parseReportDate(value) {
  if (!value) return null;
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function dateRank(value) {
  const date = parseReportDate(value);
  return date ? date.getTime() : Number.NEGATIVE_INFINITY;
}

function todayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function reportGroup(entry) {
  const status = (entry.dataset.status || "").toLowerCase();
  if (["recent", "completed", "previous", "past"].includes(status)) return 1;
  if (["unscheduled", "draft"].includes(status)) return 2;

  const stamp = dateRank(entry.dataset.date);
  if (stamp !== Number.NEGATIVE_INFINITY) {
    return stamp >= todayStart() ? 0 : 1;
  }

  if (["upcoming", "ongoing", "planned"].includes(status)) return 0;

  return 2;
}

function compareEntries(a, b) {
  const groupDiff = reportGroup(a) - reportGroup(b);
  if (groupDiff !== 0) return groupDiff;

  const group = reportGroup(a);
  const aDate = dateRank(a.dataset.date);
  const bDate = dateRank(b.dataset.date);
  const dateDiff = group === 0 ? aDate - bDate : bDate - aDate;
  if (dateDiff !== 0) return dateDiff;

  return (a.dataset.reportId || "").localeCompare(b.dataset.reportId || "");
}

function createTableGroupRow(group) {
  const row = document.createElement("tr");
  row.className = "report-group-row";
  row.dataset.reportGroup = String(group);

  const cell = document.createElement("td");
  cell.colSpan = 5;
  cell.innerHTML = `<span>${reportGroupLabels[group]}</span>`;
  row.appendChild(cell);

  return row;
}

function createCardGroupHeading(group) {
  const heading = document.createElement("div");
  heading.className = "report-group-heading";
  heading.dataset.reportGroup = String(group);
  heading.innerHTML = `<span>${reportGroupLabels[group]}</span>`;
  return heading;
}

function insertGroupSeparators(container, entries, createSeparator) {
  container.querySelectorAll(".report-group-row, .report-group-heading").forEach((node) => node.remove());

  const groups = new Map();
  entries.forEach((entry) => {
    const group = reportGroup(entry);
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group).push(entry);
  });

  const orderedGroups = [0, 1];
  [...groups.keys()].sort((a, b) => a - b).forEach((group) => {
    if (!orderedGroups.includes(group)) orderedGroups.push(group);
  });

  orderedGroups.forEach((group) => {
    container.appendChild(createSeparator(group));
    (groups.get(group) || []).forEach((entry) => container.appendChild(entry));
  });
}

function sortReportEntries() {
  const tableBody = document.querySelector(".speaker-table tbody");
  const cards = [...speakerList.querySelectorAll(".speaker-card")];
  const rows = [...tableBody.querySelectorAll("tr[data-report-id]")];

  insertGroupSeparators(tableBody, rows.sort(compareEntries), createTableGroupRow);
  insertGroupSeparators(speakerList, cards.sort(compareEntries), createCardGroupHeading);
}

function updateGroupSeparators() {
  speakerList.querySelectorAll(".report-group-heading").forEach((heading) => {
    heading.hidden = false;
  });

  document.querySelectorAll(".speaker-table .report-group-row").forEach((row) => {
    row.hidden = false;
  });
}

function updateResults() {
  if (!speakerList || !searchInput) return;

  const query = searchInput.value.trim().toLowerCase();
  const cards = [...speakerList.querySelectorAll(".speaker-card")];
  const selectedYear = yearFilter ? yearFilter.value : "all";

  const matchesCard = (card) => {
    const yearMatch = selectedYear === "all" || card.dataset.year === selectedYear;
    const text = [
      card.dataset.name,
      card.dataset.affiliation,
      card.dataset.topic,
      card.textContent
    ].join(" ").toLowerCase();
    return yearMatch && text.includes(query);
  };

  const matches = cards.filter(matchesCard);
  const upcomingMatches = matches.filter((card) => reportGroup(card) === 0);
  const previousMatches = matches.filter((card) => reportGroup(card) === 1);
  const otherMatches = matches.filter((card) => ![0, 1].includes(reportGroup(card)));

  const totalPages = Math.max(1, Math.ceil(previousMatches.length / previousPageSize));
  currentPage = Math.min(currentPage, totalPages);
  const start = (currentPage - 1) * previousPageSize;
  const previousPageMatches = previousMatches.slice(start, start + previousPageSize);
  const visibleIds = new Set([
    ...upcomingMatches,
    ...previousPageMatches,
    ...otherMatches
  ].map((card) => card.dataset.reportId));

  cards.forEach((card) => {
    card.hidden = !visibleIds.has(card.dataset.reportId);
  });

  tableRows.forEach((row) => {
    const text = [
      row.dataset.name,
      row.dataset.affiliation,
      row.dataset.topic,
      row.textContent
    ].join(" ").toLowerCase();
    const yearMatch = selectedYear === "all" || row.dataset.year === selectedYear;
    const match = yearMatch && text.includes(query);
    row.hidden = !match || !visibleIds.has(row.dataset.reportId);
  });

  updateGroupSeparators();

  if (pageInfo) pageInfo.textContent = `Previous Talks Page ${currentPage} / ${totalPages}`;
  if (prevPageButton) prevPageButton.disabled = currentPage <= 1;
  if (nextPageButton) nextPageButton.disabled = currentPage >= totalPages;
}

function resetAndUpdate() {
  currentPage = 1;
  updateResults();
}

if (searchInput) {
  sortReportEntries();
  searchInput.addEventListener("input", resetAndUpdate);
  yearFilter?.addEventListener("change", resetAndUpdate);
  prevPageButton?.addEventListener("click", () => {
    currentPage = Math.max(1, currentPage - 1);
    updateResults();
  });
  nextPageButton?.addEventListener("click", () => {
    currentPage += 1;
    updateResults();
  });
  updateResults();
}
