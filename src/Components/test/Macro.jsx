import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { mean,std } from 'mathjs';

const ExcelDataParser = () => {
  const [excelData, setExcelData] = useState({});

  const handleMacroUpload = (e) => {
    const file = e.target.files[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const binaryStr = event.target.result;
        const workbook = XLSX.read(binaryStr, { type: 'binary' });

        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Convert the sheet data to a JavaScript object
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Restructure the data based on the headers
        const formattedData = data.reduce((acc, row) => {
          const [status, year, ...values] = row;
          values.forEach((value, index) => {
            const header = data[0][index + 2]; // Assuming headers start from 3rd column
            if (!acc[header]) {
              acc[header] = [];
            }
            acc[header].push({
              status,
              year,
              value,
            });
          });
          return acc;
        }, {});

        // Calculate additional metrics
        const metrics = Object.entries(formattedData).reduce((acc, [header, data]) => {
          const actualData = data.filter(item => item.status === 'Actual');
          const actualValues = actualData.map(item => item.value);
          const last5Years = actualData.slice(-5).map(item => item.value);

          acc[header] = {
            mean_all: mean(actualValues),
            mean_last5: mean(last5Years),
            standardDeviation_all: std(actualValues),
            standardDeviation_last5: std(last5Years),
          };

          return acc;
        }, {});

        
        console.log(metrics);
        console.log(formattedData);
        
        
      };
      reader.readAsBinaryString(file);
    }
  };

  // Memoize the calculated metrics to avoid unnecessary recalculations
  const { data, metrics } = useMemo(() => excelData, [excelData]);

  return (
    <div>
      <label htmlFor="macro">Macro Economics File </label>
      <input type="file" accept=".xlsx, .xls" name="macro" onChange={handleMacroUpload} />
    
    </div>
  );
};

export default ExcelDataParser;