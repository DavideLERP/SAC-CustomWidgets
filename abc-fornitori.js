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

    _formatDetailCellText(value, index) {
      if (index === 1) {
        return this._formatDateText(value);
      }

      if (index === 2 || index === 5 || index === 6 || index === 9 || index === 10) {
        return this._formatInteger(value);
      }

      if (index === 3 || index === 7 || index === 11) {
        return this._formatPercent(value);
      }

      return String(value || "");
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

    _formatKpiCellText(value, index) {
      if (index === 1) {
        return String(value || "");
      }

      if (index === 2 || index === 3) {
        return this._formatInteger(value);
      }

      if (index === 4 || index === 5) {
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
                ${header.map((cell, index) => `<th class="${index > 0 ? "num" : ""}">${this._escape(cell)}</th>`).join("")}
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

    _getKpiTotal(rows, year) {
      const totalRow = rows.find((row) => row[0] === year && row[1] === "Totale");

      if (!totalRow) {
        return {
          value: "0",
          count: "0"
        };
      }

      return {
        value: totalRow[2] || "0",
        count: totalRow[3] || "0"
      };
    }

    _getDetailTotalValues(kpiRows) {
      const yearY = this._yearFromHeader(this._kpiHeaderY);
      const yearY1 = this._yearFromHeader(this._kpiHeaderY1);
      const yearY2 = this._yearFromHeader(this._kpiHeaderY2);

      const totalY = this._getKpiTotal(kpiRows, yearY);
      const totalY1 = this._getKpiTotal(kpiRows, yearY1);
      const totalY2 = this._getKpiTotal(kpiRows, yearY2);

      const totalYValue = Number(totalY.value);
      const totalY1Value = Number(totalY1.value);
      const totalY2Value = Number(totalY2.value);

      const deltaYY1 = Number.isFinite(totalYValue) && Number.isFinite(totalY1Value)
        ? String(totalYValue - totalY1Value)
        : "0";
      const deltaY1Y2 = Number.isFinite(totalY1Value) && Number.isFinite(totalY2Value)
        ? String(totalY1Value - totalY2Value)
        : "0";

      const values = [
        "Totali",
        "",
        totalY.value,
        "1",
        "",
        deltaYY1,
        totalY1.value,
        "1",
        "",
        deltaY1Y2,
        totalY2.value,
        "1",
        ""
      ];

      return values;
    }

    _renderDetailTotalRow(header, kpiRows) {
      const values = this._getDetailTotalValues(kpiRows);

      return `
        <tr class="detail-total-row">
          ${header.map((_, index) => {
            const value = values[index] || "";
            const isNum = index >= 2 && index !== 4 && index !== 8 && index !== 12;
            return `<td class="${isNum ? "num" : ""}">${this._formatDetailCell(value, index)}</td>`;
          }).join("")}
        </tr>
      `;
    }

    _buildDetailCsv() {
      const header = this._parseHeader(this._detailHeader);
      const rows = this._parseRows(this._detailData);
      const kpiRows = this._parseRows(this._kpiData);

      if (header.length === 0) {
        return "";
      }

      const csvRows = [header];
      const totalValues = this._getDetailTotalValues(kpiRows);

      csvRows.push(header.map((_, index) => this._formatDetailCellText(totalValues[index] || "", index)));

      rows.forEach((row) => {
        csvRows.push(header.map((_, index) => this._formatDetailCellText(row[index] || "", index)));
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
          this._formatKpiCellText(row[5], 5)
        ]);
      });

      return this._rowsToCsv(csvRows);
    }

    _exportDetail() {
      const csv = this._buildDetailCsv();

      if (!csv) {
        return;
      }

      this._downloadCsv("ABC_Fornitori_Dettaglio.csv", csv);
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

      this._downloadCsv("ABC_Fornitori_KPI_" + year + ".csv", csv);
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
          <div class="detail-toolbar">
            ${this._renderTableMenu("data-export-detail")}
          </div>
          <div class="table-wrap">
            <table class="detail-table">
              <thead>
                <tr>
                  ${header.map((cell, index) => `<th class="${index >= 2 ? "num" : ""}">${this._escape(cell)}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${this._renderDetailTotalRow(header, this._parseRows(this._kpiData))}
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

          .title-actions {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          h2 {
            margin: 0;
            font-size: 18px;
            line-height: 1.2;
            font-weight: 700;
            color: #111111;
          }

          .badge {
            border-left: 4px solid ${this._accentColor};
            padding-left: 8px;
            font-size: 12px;
            color: #58595b;
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
            border-radius: 2px;
            background: #ffffff;
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
          .table-menu:focus-within .menu-trigger {
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

          .table-menu:hover .menu-popover,
          .table-menu:focus-within .menu-popover {
            display: block;
          }

          .menu-popover button {
            width: 100%;
            height: 28px;
            border: 0;
            padding: 0 12px;
            background: transparent;
            color: #32363a;
            font: inherit;
            font-size: 12px;
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
            min-width: 1320px;
          }

          .detail-table thead th {
            position: sticky;
            top: 0;
            z-index: 4;
          }

          .detail-total-row td {
            position: sticky;
            top: 25px;
            z-index: 3;
            font-weight: 700;
            background: #ffffff;
            border-bottom: 1px solid #4f5255;
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
            <div class="title-actions">
              <div class="badge">${detailRows.length} fornitori</div>
            </div>
          </div>

          <div class="kpi-grid">
            ${this._renderKpiSection(this._kpiHeaderY, kpiRows, "Y")}
            ${this._renderKpiSection(this._kpiHeaderY1, kpiRows, "Y1")}
            ${this._renderKpiSection(this._kpiHeaderY2, kpiRows, "Y2")}
          </div>

          ${this._renderDetailTable(detailHeader, detailRows)}
        </div>
      `;

      const detailButton = this.shadowRoot.querySelector("[data-export-detail]");
      const kpiButtons = this.shadowRoot.querySelectorAll("[data-export-kpi]");

      if (detailButton) {
        detailButton.addEventListener("click", () => this._exportDetail());
      }

      kpiButtons.forEach((button) => {
        button.addEventListener("click", () => this._exportKpi(button.getAttribute("data-export-kpi")));
      });
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
