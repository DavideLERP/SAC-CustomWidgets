(() => {
  class AbcProdotti extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });

      this._title = "Analisi ABC Prodotti";
      this._accentColor = "#f0ab00";

      this._detailHeader = "";
      this._detailData = "";
      this._kpiHeaderY = "";
      this._kpiHeaderY1 = "";
      this._kpiHeaderY2 = "";
      this._kpiData = "";
      this._openMenu = null;
      this._renderQueued = false;
      this._renderTimer = 0;
      this._detailHeaderCache = [];
      this._detailRowsCache = [];
      this._kpiRowsCache = [];
      this._detailScrollTop = 0;
      this._detailVirtualStart = -1;
      this._detailVirtualEnd = -1;
      this._detailScrollFrame = 0;
      this._detailRowHeight = 24;
      this._detailVirtualBuffer = 18;
      this._detailStickyOffset = 49;
    }

    set title(value) {
      this._title = value || "Analisi ABC Prodotti";
      this._scheduleRender();
    }

    get title() {
      return this._title;
    }

    set accentColor(value) {
      this._accentColor = value || "#f0ab00";
      this._scheduleRender();
    }

    get accentColor() {
      return this._accentColor;
    }

    connectedCallback() {
      this._render();
    }

    onCustomWidgetAfterUpdate() {
      this._scheduleRender();
    }

    setDetailHeader(payload) {
      this._detailHeader = payload || "";
      this._scheduleRender();
    }

    setDetailData(payload) {
      this._detailData = payload || "";
      this._resetDetailViewport();
      this._scheduleRender();
    }

    clearDetailData() {
      this._detailData = "";
      this._resetDetailViewport();
    }

    appendDetailData(payload) {
      const chunk = payload || "";

      if (!chunk) {
        return;
      }

      if (this._detailData && this._detailData.slice(-1) !== "\n") {
        this._detailData += "\n";
      }

      this._detailData += chunk;
    }

    renderDetailData() {
      this._flushRender();
    }

    setKpiHeaderY(payload) {
      this._kpiHeaderY = payload || "";
      this._scheduleRender();
    }

    setKpiHeaderY1(payload) {
      this._kpiHeaderY1 = payload || "";
      this._scheduleRender();
    }

    setKpiHeaderY2(payload) {
      this._kpiHeaderY2 = payload || "";
      this._scheduleRender();
    }

    setKpiData(payload) {
      this._kpiData = payload || "";
      this._scheduleRender();
    }

    _resetDetailViewport() {
      this._detailScrollTop = 0;
      this._detailVirtualStart = -1;
      this._detailVirtualEnd = -1;
      this._detailScrollFrame = 0;
    }

    _scheduleRender() {
      if (this._renderQueued) {
        return;
      }

      this._renderQueued = true;
      this._renderTimer = setTimeout(() => {
        this._renderQueued = false;
        this._renderTimer = 0;
        this._render();
      }, 0);
    }

    _flushRender() {
      if (this._renderQueued) {
        clearTimeout(this._renderTimer);
        this._renderQueued = false;
        this._renderTimer = 0;
      }

      this._render();
    }

    _downloadCsv(filename, content) {
      const blob = new Blob(["\uFEFF" + content], {
        type: "text/csv;charset=utf-8"
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = filename;
      link.style.display = "none";

      this.shadowRoot.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    }

    _csvEscape(value) {
      const text = String(value || "");

      if (text.indexOf(";") >= 0 || text.indexOf("\"") >= 0 || text.indexOf("\n") >= 0) {
        return "\"" + text.replace(/"/g, "\"\"") + "\"";
      }

      return text;
    }

    _rowsToCsv(rows) {
      return rows
        .map((row) => row.map((cell) => this._csvEscape(cell)).join(";"))
        .join("\n");
    }

    _parseRows(payload) {
      if (!payload) {
        return [];
      }

      return String(payload)
        .split("\n")
        .map((row) => row.trimEnd())
        .filter((row) => row.length > 0)
        .map((row) => row.split("\t"));
    }

    _parseHeader(payload) {
      if (!payload) {
        return [];
      }

      return String(payload).split("\t");
    }

    _yearFromHeader(headerPayload) {
      const match = String(headerPayload || "").match(/(?:19|20)\d{2}/);
      return match ? match[0] : "";
    }

    _formatDateText(value) {
      const text = String(value || "");

      if (text.length === 10 && text.charAt(4) === "-" && text.charAt(7) === "-") {
        return `${text.substring(8, 10)}/${text.substring(5, 7)}/${text.substring(0, 4)}`;
      }

      if (text.length === 8) {
        return `${text.substring(6, 8)}/${text.substring(4, 6)}/${text.substring(0, 4)}`;
      }

      return text;
    }

    _formatDate(value) {
      return this._escape(this._formatDateText(value));
    }

    _formatInteger(value) {
      const num = Number(value);

      if (!Number.isFinite(num)) {
        return "";
      }

      return Math.round(num).toLocaleString("it-IT", {
        maximumFractionDigits: 0
      });
    }

    _formatPercent(value) {
      const num = Number(value);

      if (!Number.isFinite(num)) {
        return "";
      }

      return (num * 100).toLocaleString("it-IT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }) + "%";
    }

    _isDetailDateColumn(label) {
      return false;
    }

    _isDetailValueColumn(label) {
      const text = String(label || "");
      return text.indexOf("Valore ") === 0 || text.indexOf("Val. Netto ") === 0;
    }

    _isDetailQuantityColumn(label) {
      const text = String(label || "");
      return text.indexOf("Qt. ") === 0 || text.indexOf("QT ") === 0;
    }

    _isDetailPercentColumn(label) {
      return String(label || "").indexOf("% ABC ") === 0;
    }

    _isDetailDeltaColumn(label) {
      return false;
    }

    _isDetailAbcColumn(label) {
      return String(label || "").indexOf("ABC ") === 0;
    }

    _isDetailNumericColumn(label) {
      return this._isDetailValueColumn(label)
        || this._isDetailQuantityColumn(label)
        || this._isDetailPercentColumn(label)
        || this._isDetailDeltaColumn(label);
    }

    _isDetailRightAlignedColumn(label, index) {
      return index > 1 && !this._isDetailDateColumn(label);
    }

    _getDeltaClass(value) {
      const text = String(value || "").trim();

      if (text === "") {
        return "";
      }

      const num = Number(text);

      if (!Number.isFinite(num)) {
        return "";
      }

      return num >= 0 ? "delta-positive" : "delta-negative";
    }

    _formatDetailCell(value, index, label) {
      if (this._isDetailDateColumn(label)) {
        return this._formatDate(value);
      }

      if (this._isDetailPercentColumn(label)) {
        return this._formatPercent(value);
      }

      if (this._isDetailValueColumn(label) || this._isDetailQuantityColumn(label) || this._isDetailDeltaColumn(label)) {
        return this._formatInteger(value);
      }

      return this._escape(value);
    }

    _formatDetailCellText(value, index, label) {
      if (this._isDetailDateColumn(label)) {
        return this._formatDateText(value);
      }

      if (this._isDetailPercentColumn(label)) {
        return this._formatPercent(value);
      }

      if (this._isDetailValueColumn(label) || this._isDetailQuantityColumn(label) || this._isDetailDeltaColumn(label)) {
        return this._formatInteger(value);
      }

      return String(value || "");
    }

    _formatKpiCell(value, index) {
      if (index === 1) {
        return this._escape(value);
      }

      if (index === 2 || index === 3 || index === 4) {
        return this._formatInteger(value);
      }

      if (index === 5 || index === 6) {
        return this._formatPercent(value);
      }

      return this._escape(value);
    }

    _formatKpiCellText(value, index) {
      if (index === 1) {
        return String(value || "");
      }

      if (index === 2 || index === 3 || index === 4) {
        return this._formatInteger(value);
      }

      if (index === 5 || index === 6) {
        return this._formatPercent(value);
      }

      return String(value || "");
    }

    _orderKpiRows(rows) {
      const totalRows = rows.filter((row) => row[1] === "Totale");
      const detailRows = rows.filter((row) => row[1] !== "Totale");

      return totalRows.concat(detailRows);
    }

    _renderTableMenu(attributes) {
      return `
        <div class="table-menu">
          <button class="menu-trigger" type="button" aria-label="Azioni tabella">⋮</button>
          <div class="menu-popover">
            <button type="button" ${attributes}>Esporta CSV</button>
          </div>
        </div>
      `;
    }

    _renderKpiSection(headerPayload, rows, sectionKey) {
      const header = this._parseHeader(headerPayload);
      const year = this._yearFromHeader(headerPayload);
      const yearRows = this._orderKpiRows(rows.filter((row) => row[0] === year));

      if (!year || header.length === 0 || yearRows.length === 0) {
        return "";
      }

      return `
        <section class="kpi-card">
          <div class="card-header">
            <h3>PIVOT ABC ${this._escape(year)}</h3>
            ${this._renderTableMenu(`data-export-kpi="${this._escape(sectionKey)}"`)}
          </div>
          <table class="kpi-table">
            <thead>
              <tr>
                ${header.map((cell, index) => `<th class="${index > 0 ? "kpi-indicator-head" : "kpi-dimension-head"}">${this._escape(cell)}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${yearRows.map((row) => `
                <tr class="${row[1] === "Totale" ? "total-row" : ""}">
                  <td>${this._escape(row[1] || "")}</td>
                  <td class="num">${this._formatKpiCell(row[2], 2)}</td>
                  <td class="num">${this._formatKpiCell(row[3], 3)}</td>
                  <td class="num">${this._formatKpiCell(row[4], 4)}</td>
                  <td class="num">${this._formatKpiCell(row[5], 5)}</td>
                  <td class="num">${this._formatKpiCell(row[6], 6)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </section>
      `;
    }

    _findKpiTotalRow(rows, year) {
      return rows.find((row) => row[0] === year && row[1] === "Totale");
    }

    _getKpiTotal(rows, year) {
      const totalRow = this._findKpiTotalRow(rows, year);

      if (!totalRow) {
        return {
          value: "0",
          count: "0"
        };
      }

      return {
        value: totalRow[2] || "0",
        count: totalRow[4] || "0"
      };
    }

    _getDetailDeltaValue(label, kpiRows) {
      const match = String(label || "").match(/^Delta\s+((?:19|20)\d{2})\s+vs\s+((?:19|20)\d{2})/);

      if (!match) {
        return "";
      }

      const totalCurrent = this._findKpiTotalRow(kpiRows, match[1]);
      const totalPrevious = this._findKpiTotalRow(kpiRows, match[2]);

      if (!totalCurrent || !totalPrevious) {
        return "";
      }

      const currentValue = Number(totalCurrent[2] || "0");
      const previousValue = Number(totalPrevious[2] || "0");

      if (!Number.isFinite(currentValue) || !Number.isFinite(previousValue)) {
        return "";
      }

      return String(currentValue - previousValue);
    }

    _getDetailTotalValues(header, kpiRows) {
      return header.map((label, index) => {
        if (index === 0) {
          return "Totali";
        }

        if (this._isDetailDateColumn(label) || this._isDetailAbcColumn(label)) {
          return "";
        }

        if (this._isDetailValueColumn(label)) {
          const year = this._yearFromHeader(label);
          const totalRow = this._findKpiTotalRow(kpiRows, year);
          return totalRow ? (totalRow[2] || "0") : "";
        }

        if (this._isDetailQuantityColumn(label)) {
          const year = this._yearFromHeader(label);
          const totalRow = this._findKpiTotalRow(kpiRows, year);
          return totalRow ? (totalRow[3] || "0") : "";
        }

        if (this._isDetailPercentColumn(label)) {
          const year = this._yearFromHeader(label);
          const totalRow = this._findKpiTotalRow(kpiRows, year);
          return totalRow ? "1" : "";
        }

        if (this._isDetailDeltaColumn(label)) {
          return this._getDetailDeltaValue(label, kpiRows);
        }

        return "";
      });
    }

    _renderDetailTotalRow(header, kpiRows) {
      const values = this._getDetailTotalValues(header, kpiRows);

      return `
        <tr class="detail-total-row">
          ${header.map((label, index) => {
            const value = values[index] || "";
            const alignRight = this._isDetailRightAlignedColumn(label, index);
            const deltaClass = this._isDetailDeltaColumn(label) ? this._getDeltaClass(value) : "";
            return `<td class="${alignRight ? "num" : ""} ${deltaClass}">${this._formatDetailCell(value, index, label)}</td>`;
          }).join("")}
        </tr>
      `;
    }

    _getDetailVirtualWindow(rowCount, viewportHeight, scrollTop) {
      const rowHeight = this._detailRowHeight;
      const buffer = this._detailVirtualBuffer;
      const safeViewportHeight = Math.max(rowHeight * 8, Number(viewportHeight) || rowHeight * 18);
      const safeScrollTop = Math.max(0, Number(scrollTop) || 0);
      const dataScrollTop = Math.max(0, safeScrollTop - this._detailStickyOffset);
      const firstVisible = Math.floor(dataScrollTop / rowHeight);
      const visibleCount = Math.ceil(safeViewportHeight / rowHeight) + (buffer * 2);
      const start = Math.max(0, firstVisible - buffer);
      const end = Math.min(rowCount, start + visibleCount);

      return {
        start,
        end,
        topHeight: start * rowHeight,
        bottomHeight: Math.max(0, rowCount - end) * rowHeight
      };
    }

    _renderDetailSpacer(height, colSpan) {
      if (height <= 0) {
        return "";
      }

      return `<tr class="virtual-spacer"><td colspan="${colSpan}" style="height:${height}px"></td></tr>`;
    }

    _renderDetailRows(header, rows) {
      return rows.map((row) => `
        <tr>
          ${header.map((label, index) => {
            const value = row[index] || "";
            const alignRight = this._isDetailRightAlignedColumn(label, index);
            const isAbc = this._isDetailAbcColumn(label);
            const deltaClass = this._isDetailDeltaColumn(label) ? this._getDeltaClass(value) : "";
            return `<td class="${alignRight ? "num" : ""} ${deltaClass} ${isAbc ? `abc abc-${this._escape(value)}` : ""}">${this._formatDetailCell(value, index, label)}</td>`;
          }).join("")}
        </tr>
      `).join("");
    }

    _renderDetailVirtualBody(header, rows, kpiRows, virtualWindow) {
      return `
        ${this._renderDetailTotalRow(header, kpiRows)}
        ${this._renderDetailSpacer(virtualWindow.topHeight, header.length)}
        ${this._renderDetailRows(header, rows.slice(virtualWindow.start, virtualWindow.end))}
        ${this._renderDetailSpacer(virtualWindow.bottomHeight, header.length)}
      `;
    }

    _syncVirtualDetailRows(force) {
      const body = this.shadowRoot.querySelector("[data-detail-body]");
      const wrap = this.shadowRoot.querySelector("[data-detail-scroll]");

      if (!body || !wrap || this._detailHeaderCache.length === 0 || this._detailRowsCache.length === 0) {
        return;
      }

      const virtualWindow = this._getDetailVirtualWindow(
        this._detailRowsCache.length,
        wrap.clientHeight,
        wrap.scrollTop
      );

      if (!force && virtualWindow.start === this._detailVirtualStart && virtualWindow.end === this._detailVirtualEnd) {
        return;
      }

      this._detailVirtualStart = virtualWindow.start;
      this._detailVirtualEnd = virtualWindow.end;
      body.innerHTML = this._renderDetailVirtualBody(
        this._detailHeaderCache,
        this._detailRowsCache,
        this._kpiRowsCache,
        virtualWindow
      );
    }

    _attachDetailVirtualScroll() {
      const wrap = this.shadowRoot.querySelector("[data-detail-scroll]");

      if (!wrap) {
        return;
      }

      if (this._detailScrollTop > 0) {
        wrap.scrollTop = Math.min(this._detailScrollTop, Math.max(0, wrap.scrollHeight - wrap.clientHeight));
      }

      wrap.addEventListener("scroll", () => {
        this._detailScrollTop = wrap.scrollTop;

        if (this._detailScrollFrame) {
          return;
        }

        this._detailScrollFrame = requestAnimationFrame(() => {
          this._detailScrollFrame = 0;
          this._syncVirtualDetailRows(false);
        });
      });

      this._syncVirtualDetailRows(true);
    }

    _buildDetailCsv() {
      const header = this._parseHeader(this._detailHeader);
      const rows = this._parseRows(this._detailData);
      const kpiRows = this._parseRows(this._kpiData);

      if (header.length === 0) {
        return "";
      }

      const csvRows = [header];
      const totalValues = this._getDetailTotalValues(header, kpiRows);

      csvRows.push(header.map((label, index) => this._formatDetailCellText(totalValues[index] || "", index, label)));

      rows.forEach((row) => {
        csvRows.push(header.map((label, index) => this._formatDetailCellText(row[index] || "", index, label)));
      });

      return this._rowsToCsv(csvRows);
    }

    _buildKpiCsvSection(headerPayload) {
      const kpiRows = this._parseRows(this._kpiData);
      const header = this._parseHeader(headerPayload);
      const year = this._yearFromHeader(headerPayload);
      const yearRows = this._orderKpiRows(kpiRows.filter((row) => row[0] === year));
      const csvRows = [];

      if (!year || header.length === 0 || yearRows.length === 0) {
        return "";
      }

      csvRows.push([`PIVOT ABC ${year}`]);
      csvRows.push(header);

      yearRows.forEach((row) => {
        csvRows.push([
          this._formatKpiCellText(row[1], 1),
          this._formatKpiCellText(row[2], 2),
          this._formatKpiCellText(row[3], 3),
          this._formatKpiCellText(row[4], 4),
          this._formatKpiCellText(row[5], 5),
          this._formatKpiCellText(row[6], 6)
        ]);
      });

      return this._rowsToCsv(csvRows);
    }

    _exportDetail() {
      const csv = this._buildDetailCsv();

      if (!csv) {
        return;
      }

      this._downloadCsv("ABC_Prodotti_Dettaglio.csv", csv);
    }

    _exportKpi(sectionKey) {
      let headerPayload = "";

      if (sectionKey === "Y") {
        headerPayload = this._kpiHeaderY;
      } else if (sectionKey === "Y1") {
        headerPayload = this._kpiHeaderY1;
      } else if (sectionKey === "Y2") {
        headerPayload = this._kpiHeaderY2;
      }

      const year = this._yearFromHeader(headerPayload);
      const csv = this._buildKpiCsvSection(headerPayload);

      if (!csv) {
        return;
      }

      this._downloadCsv("ABC_Prodotti_KPI_" + year + ".csv", csv);
    }

    _renderDetailTable(header, rows, kpiRows) {
      if (header.length === 0 || rows.length === 0) {
        return `
          <div class="empty">
            Premi il pulsante di calcolo ABC per popolare la tabella.
          </div>
        `;
      }

      const virtualWindow = this._getDetailVirtualWindow(rows.length, this._detailRowHeight * 22, this._detailScrollTop);

      return `
        <section class="detail-card">
          <div class="detail-toolbar">
            ${this._renderTableMenu("data-export-detail")}
          </div>
          <div class="table-wrap" data-detail-scroll>
            <table class="detail-table">
              <thead>
                <tr>
                  ${header.map((cell, index) => `<th class="${this._isDetailRightAlignedColumn(cell, index) ? "num" : ""}">${this._escape(cell)}</th>`).join("")}
                </tr>
              </thead>
              <tbody data-detail-body>
                ${this._renderDetailVirtualBody(header, rows, kpiRows, virtualWindow)}
              </tbody>
            </table>
          </div>
        </section>
      `;
    }

    _render() {
      if (!this.shadowRoot) {
        return;
      }

      this._openMenu = null;

      const detailHeader = this._parseHeader(this._detailHeader);
      const detailRows = this._parseRows(this._detailData);
      const kpiRows = this._parseRows(this._kpiData);

      this._detailHeaderCache = detailHeader;
      this._detailRowsCache = detailRows;
      this._kpiRowsCache = kpiRows;
      this._detailVirtualStart = -1;
      this._detailVirtualEnd = -1;
      this._detailScrollFrame = 0;

      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            box-sizing: border-box;
            height: 100%;
            font-family: "72", "72full", Arial, Helvetica, sans-serif;
            color: #58595b;
            background: #fff;
          }

          * {
            box-sizing: border-box;
          }

          .shell {
            height: 100%;
            min-height: 320px;
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding: 8px;
            overflow: hidden;
            background: #ffffff;
          }

          .title-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            min-height: 28px;
          }

          h2 {
            margin: 0;
            font-size: 18px;
            line-height: 1.2;
            font-weight: 700;
            color: #111111;
          }

          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(250px, 1fr));
            gap: 10px;
            flex: 0 0 auto;
          }

          .kpi-card,
          .detail-card {
            border: 1px solid #d7dce3;
            border-radius: 2px;
            background: #ffffff;
          }

          .kpi-card {
            overflow: visible;
          }

          .detail-card {
            overflow: hidden;
          }

          .card-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            padding: 7px 9px;
            background: ${this._accentColor};
          }

          .kpi-card h3 {
            margin: 0;
            color: #111827;
            font-size: 12px;
            line-height: 1.2;
            font-weight: 700;
          }

          .table-menu {
            position: relative;
            flex: 0 0 auto;
          }

          .menu-trigger {
            width: 24px;
            height: 24px;
            border: 0;
            border-radius: 2px;
            background: transparent;
            color: #32363a;
            font-size: 18px;
            line-height: 20px;
            cursor: pointer;
          }

          .menu-trigger:hover,
          .table-menu:focus-within .menu-trigger,
          .table-menu.is-open .menu-trigger {
            background: rgba(0, 0, 0, 0.08);
          }

          .menu-popover {
            display: none;
            position: absolute;
            top: 26px;
            right: 0;
            z-index: 20;
            min-width: 128px;
            padding: 4px 0;
            border: 1px solid #d7dce3;
            background: #ffffff;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
          }

          .table-menu.is-open .menu-popover {
            display: block;
          }

          .menu-popover button {
            width: 100%;
            height: 28px;
            border: 0;
            padding: 0 12px;
            background: transparent;
            color: #32363a;
            font-size: 12px;
            font-family: "72", Arial, sans-serif;
            font-weight: 400;
            text-align: left;
            cursor: pointer;
          }

          .menu-popover button:hover {
            background: #eef3f7;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }

          th {
            background: #ffffff;
            color: #58595b;
            border-bottom: 1px solid #4f5255;
            font-weight: 700;
            text-align: left;
            white-space: nowrap;
          }

          td {
            border-bottom: 1px solid #4f5255;
            color: #58595b;
            background: #ffffff;
          }

          th,
          td {
            height: 24px;
            padding: 4px 7px;
            vertical-align: middle;
          }

          .num {
            text-align: right;
            font-variant-numeric: tabular-nums;
          }

          .kpi-table th.kpi-dimension-head {
            text-align: left !important;
          }

          .kpi-table th.kpi-indicator-head {
            text-align: right !important;
          }

          .total-row td {
            font-weight: 700;
            background: #ffffff;
          }

          .detail-card {
            min-height: 0;
            flex: 1 1 auto;
            display: flex;
            flex-direction: column;
          }

          .detail-toolbar {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 8px;
            min-height: 30px;
            padding: 3px 8px;
            border-bottom: 1px solid #d7dce3;
            background: #ffffff;
            font-size: 12px;
            font-weight: 700;
          }

          .table-wrap {
            min-height: 0;
            flex: 1 1 auto;
            overflow: auto;
          }

          .detail-table {
            min-width: 1480px;
          }

          .detail-table th,
          .detail-table td {
            white-space: nowrap;
          }

          .detail-table thead th {
            position: sticky;
            top: 0;
            z-index: 4;
          }

          .virtual-spacer td {
            height: 0;
            padding: 0;
            border: 0;
            line-height: 0;
            font-size: 0;
          }

          .detail-total-row td {
            position: sticky;
            top: 25px;
            z-index: 3;
            font-weight: 700;
            background: #ffffff;
            border-bottom: 1px solid #4f5255;
          }

          .detail-table td.delta-positive,
          .detail-total-row td.delta-positive {
            background: #dce9df;
          }

          .detail-table td.delta-negative,
          .detail-total-row td.delta-negative {
            background: #efcccc;
          }

          .abc {
            text-align: right;
            font-weight: 700;
          }

          .abc-A {
            color: #0f766e;
          }

          .abc-B {
            color: #b45309;
          }

          .abc-C {
            color: #b91c1c;
          }

          .empty {
            padding: 24px;
            color: #6b7280;
            font-size: 13px;
          }

          @media (max-width: 900px) {
            .kpi-grid {
              grid-template-columns: 1fr;
            }
          }
        </style>

        <div class="shell">
          <div class="title-row">
            <h2>${this._escape(this._title)}</h2>
          </div>

          <div class="kpi-grid">
            ${this._renderKpiSection(this._kpiHeaderY, kpiRows, "Y")}
            ${this._renderKpiSection(this._kpiHeaderY1, kpiRows, "Y1")}
            ${this._renderKpiSection(this._kpiHeaderY2, kpiRows, "Y2")}
          </div>

          ${this._renderDetailTable(detailHeader, detailRows, kpiRows)}
        </div>
      `;

      const detailButton = this.shadowRoot.querySelector("[data-export-detail]");
      const kpiButtons = this.shadowRoot.querySelectorAll("[data-export-kpi]");
      const menuTriggers = this.shadowRoot.querySelectorAll(".menu-trigger");

      menuTriggers.forEach((button) => {
        button.addEventListener("click", (event) => {
          event.stopPropagation();

          const menu = button.closest(".table-menu");
          const wasOpen = menu && menu.classList.contains("is-open");

          this._closeMenus();

          if (menu && !wasOpen) {
            menu.classList.add("is-open");
            this._openMenu = menu;
          }
        });
      });

      this.shadowRoot.addEventListener("click", (event) => {
        if (!event.target.closest(".table-menu")) {
          this._closeMenus();
        }
      });

      if (detailButton) {
        detailButton.addEventListener("click", () => {
          this._closeMenus();
          this._exportDetail();
        });
      }

      kpiButtons.forEach((button) => {
        button.addEventListener("click", () => {
          this._closeMenus();
          this._exportKpi(button.getAttribute("data-export-kpi"));
        });
      });

      this._attachDetailVirtualScroll();
    }

    _closeMenus() {
      if (this._openMenu) {
        this._openMenu.classList.remove("is-open");
        this._openMenu = null;
      }
    }

    _escape(value) {
      return String(value || "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[char]));
    }
  }

  customElements.define("com-example-sac-abc-prodotti", AbcProdotti);
})();
