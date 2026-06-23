(() => {
  class AbcFornitori extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: "open" });

      this._title = "Analisi ABC Fornitori";
      this._accentColor = "#f0ab00";

      this._detailHeader = "";
      this._detailData = "";
      this._kpiHeaderY = "";
      this._kpiHeaderY1 = "";
      this._kpiHeaderY2 = "";
      this._kpiData = "";
    }

    set title(value) {
      this._title = value || "Analisi ABC Fornitori";
      this._render();
    }

    get title() {
      return this._title;
    }

    set accentColor(value) {
      this._accentColor = value || "#f0ab00";
      this._render();
    }

    get accentColor() {
      return this._accentColor;
    }

    connectedCallback() {
      this._render();
    }

    onCustomWidgetAfterUpdate() {
      this._render();
    }

    setDetailHeader(payload) {
      this._detailHeader = payload || "";
      this._render();
    }

    setDetailData(payload) {
      this._detailData = payload || "";
      this._render();
    }

    setKpiHeaderY(payload) {
      this._kpiHeaderY = payload || "";
      this._render();
    }

    setKpiHeaderY1(payload) {
      this._kpiHeaderY1 = payload || "";
      this._render();
    }

    setKpiHeaderY2(payload) {
      this._kpiHeaderY2 = payload || "";
      this._render();
    }

    setKpiData(payload) {
      this._kpiData = payload || "";
      this._render();
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

    _formatDate(value) {
      const text = String(value || "");

      if (text.length === 10 && text.charAt(4) === "-" && text.charAt(7) === "-") {
        return `${text.substring(8, 10)}/${text.substring(5, 7)}/${text.substring(0, 4)}`;
      }

      if (text.length === 8) {
        return `${text.substring(6, 8)}/${text.substring(4, 6)}/${text.substring(0, 4)}`;
      }

      return this._escape(text);
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

    _formatDetailCell(value, index) {
      if (index === 1) {
        return this._formatDate(value);
      }

      if (index === 2 || index === 5 || index === 6 || index === 9 || index === 10) {
        return this._formatInteger(value);
      }

      if (index === 3 || index === 7 || index === 11) {
        return this._formatPercent(value);
      }

      return this._escape(value);
    }

    _formatKpiCell(value, index) {
      if (index === 1) {
        return this._escape(value);
      }

      if (index === 2 || index === 3) {
        return this._formatInteger(value);
      }

      if (index === 4 || index === 5) {
        return this._formatPercent(value);
      }

      return this._escape(value);
    }

    _renderKpiSection(headerPayload, rows) {
      const header = this._parseHeader(headerPayload);
      const year = this._yearFromHeader(headerPayload);
      const yearRows = rows.filter((row) => row[0] === year);

      if (!year || header.length === 0 || yearRows.length === 0) {
        return "";
      }

      return `
        <section class="kpi-card">
          <h3>PIVOT ABC ${this._escape(year)}</h3>
          <table class="kpi-table">
            <thead>
              <tr>
                ${header.map((cell) => `<th>${this._escape(cell)}</th>`).join("")}
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
                </tr>
              `).join("")}
            </tbody>
          </table>
        </section>
      `;
    }

    _renderDetailTable(header, rows) {
      if (header.length === 0 || rows.length === 0) {
        return `
          <div class="empty">
            Premi il pulsante di calcolo ABC per popolare la tabella.
          </div>
        `;
      }

      return `
        <section class="detail-card">
          <div class="table-wrap">
            <table class="detail-table">
              <thead>
                <tr>
                  ${header.map((cell, index) => `<th class="${index >= 2 ? "num" : ""}">${this._escape(cell)}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${rows.map((row) => `
                  <tr>
                    ${header.map((_, index) => {
                      const value = row[index] || "";
                      const isNum = index >= 2 && index !== 4 && index !== 8 && index !== 12;
                      const isAbc = index === 4 || index === 8 || index === 12;
                      return `<td class="${isNum ? "num" : ""} ${isAbc ? `abc abc-${this._escape(value)}` : ""}">${this._formatDetailCell(value, index)}</td>`;
                    }).join("")}
                  </tr>
                `).join("")}
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

      const detailHeader = this._parseHeader(this._detailHeader);
      const detailRows = this._parseRows(this._detailData);
      const kpiRows = this._parseRows(this._kpiData);

      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            box-sizing: border-box;
            height: 100%;
            font-family: Arial, Helvetica, sans-serif;
            color: #1f2937;
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
            gap: 12px;
            padding: 10px;
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
            color: #111827;
          }

          .badge {
            border-left: 4px solid ${this._accentColor};
            padding-left: 8px;
            font-size: 12px;
            color: #6b7280;
            white-space: nowrap;
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
            border-radius: 4px;
            background: #ffffff;
            overflow: hidden;
          }

          .kpi-card h3 {
            margin: 0;
            padding: 7px 9px;
            background: ${this._accentColor};
            color: #111827;
            font-size: 12px;
            line-height: 1.2;
            font-weight: 700;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }

          th {
            background: #f3f4f6;
            color: #111827;
            border-bottom: 1px solid #d1d5db;
            font-weight: 700;
            text-align: left;
            white-space: nowrap;
          }

          td {
            border-bottom: 1px solid #e5e7eb;
            color: #111827;
          }

          th,
          td {
            padding: 5px 7px;
            vertical-align: middle;
          }

          .num {
            text-align: right;
            font-variant-numeric: tabular-nums;
          }

          .total-row td {
            font-weight: 700;
            background: #f9fafb;
          }

          .detail-card {
            min-height: 0;
            flex: 1 1 auto;
          }

          .table-wrap {
            height: 100%;
            overflow: auto;
          }

          .detail-table {
            min-width: 1320px;
          }

          .detail-table thead th {
            position: sticky;
            top: 0;
            z-index: 2;
          }

          .detail-table tbody tr:hover td {
            background: #fff7d6;
          }

          .abc {
            text-align: center;
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
            <div class="badge">${detailRows.length} fornitori</div>
          </div>

          <div class="kpi-grid">
            ${this._renderKpiSection(this._kpiHeaderY, kpiRows)}
            ${this._renderKpiSection(this._kpiHeaderY1, kpiRows)}
            ${this._renderKpiSection(this._kpiHeaderY2, kpiRows)}
          </div>

          ${this._renderDetailTable(detailHeader, detailRows)}
        </div>
      `;
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

  customElements.define("com-example-sac-abc-fornitori", AbcFornitori);
})();
