// Standalone stand-in for the Tableau Extensions API: serves the Superstore total sales (sum of Orders[Sales], 10,194 rows).
window.tableau = {
  TableauEventType: { SummaryDataChanged: 'summary-data-changed' },
  extensions: {
    initializeAsync: function () { return Promise.resolve(); },
    worksheetContent: { worksheet: {
      addEventListener: function () {},
      getSummaryDataAsync: function () {
        return Promise.resolve({ columns: [{ fieldName: 'Sales' }], data: [[{ value: 2326534.3543 }]] });
      }
    } }
  }
};
