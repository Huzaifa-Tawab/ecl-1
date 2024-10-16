// import React, { useState } from "react";
// import * as XLSX from "xlsx";
// import './App.css'

// function App() {
//   const [excelData, setExcelData] = useState(null);
//   const [calculatedMigrationData, setCalculatedMigrationData] = useState(null);

//   // Function to handle file upload
//   const handleFileUpload = (e) => {
//     const file = e.target.files[0];

//     if (file) {
//       const reader = new FileReader();
//       reader.onload = (event) => {
//         const binaryStr = event.target.result;
//         const workbook = XLSX.read(binaryStr, { type: "binary" });

//         // Get the first sheet
//         const sheetName = workbook.SheetNames[0];
//         const sheet = workbook.Sheets[sheetName];

//         // Define the options to skip the first row (header starts from A2)
//         const options = {
//           header: 1, // Take raw row data as an array, preserving headers
//           range: 1, // Start from row 2 (0-indexed, so row 2 is 1)
//         };

//         // Convert the sheet to JSON with options
//         const rawData = XLSX.utils.sheet_to_json(sheet, options);

//         // Extract headers dynamically (from the second row)
//         const headers = rawData[0];

//         const nonHeaders = ["Date", "Segment", "Total"];
//         const newHeader = headers.filter((item) => !nonHeaders.includes(item));

//         // Extract the rest of the data starting from the second row

//         const data = rawData
//           .slice(1) // Extract rows starting from the second row
//           .filter((row) => row.length > 0); // Remove empty arrays

//         setExcelData({ headers, data });

//         // Filter out the non-header items (i.e., exclude "Date", "Segment", "Total")

//         // console.log(newHeader);
//         calculateMigration(data, headers);
//       };

//       reader.readAsBinaryString(file);
//     }
//   };

//   const calculateMigration = (data, headers) => {
//     // console.log(data);

//     const resultData = data
//       .filter((_, rowIndex) => rowIndex !== 0) // Skip the first row entirely
//       .map((row, rowIndex) => {
//         // console.log("Row ", rowIndex);

//         return row
//           .filter((_, colIndex) => colIndex > 1) // Skip the 'Date' and 'Segment' columns
//           .map((cellValue, colIndex) => {
//             const adjustedColIndex = colIndex + 3; // Adjust the column index since 'Date' and 'Segment' are removed
//             const previousRowValue = data[rowIndex][adjustedColIndex - 2];
//             const currentValue = parseFloat(cellValue) || 0;
//             const previousValue = parseFloat(previousRowValue) || 0;
//             // console.log(previousRowValue, currentValue, adjustedColIndex);

//             // Avoid division by zero
//             if (previousValue === 0) {
//               return previousRowValue;
//             }

//             const migrationValue = currentValue / previousValue;

//             // console.log(`${rowIndex + 1} || ${adjustedColIndex} `);
//             // console.log(
//             //   `${currentValue} / ${previousValue} = ${migrationValue}`
//             // );
//             // console.log(`__________________________________________________`);

//             // Return 1 if migration value is greater than 1, else return the value

//             return migrationValue > 1 ? 1 : migrationValue.toFixed(5);
//           });
//       });

//     setCalculatedMigrationData(resultData);
//     calculateAveragePerSegment(resultData);
//   };
//   function calculateAveragePerSegment(data) {
//     const newData = splitBySegments(data); 
//     console.log(newData);
    
//     const averages = {}; // To store the average values for each segment

//     // Iterate over each segment in newData
//     for (const segment in newData) {
//         const segmentData = newData[segment];
//         const columnCount = segmentData[0].length; // Get the number of columns
//         const sums = Array(columnCount).fill(0); // Initialize sums for each column
//         const rowCount = segmentData.length; // Get the number of rows in the segment
        
//         // Sum values for each column
//         segmentData.forEach(row => {
//             row.forEach((value, index) => {
//                 sums[index] += parseFloat(value); // Sum the values column-wise
//             });
//         });

//         // Calculate averages for each column
//         const averagesForSegment = sums.map(sum => ((sum / rowCount) *100).toFixed(2)); // Calculate average and fix to 2 decimal places
//         averages[segment] = averagesForSegment ; // Store averages in the averages object
//     }

//     console.log(averages); // Output the averages for each segment
// }
// function splitBySegments(data) {
//   const segmentGroups = {};

//   data.forEach(row => {
//     const segmentName = row[0];  // First element is the segment name
//     const values = row.slice(1);  // Rest are the values

//     if (!segmentGroups[segmentName]) {
//       segmentGroups[segmentName] = [];
//     }

//     // Add the row to the appropriate segment group
//     segmentGroups[segmentName].push(values);
//   });

//   return segmentGroups;
// }
//   // Function to download the calculated data as an Excel file
//   const downloadExcel = () => {
//     const worksheet = XLSX.utils.aoa_to_sheet([
//       excelData.headers, // Add headers
//       ...calculatedMigrationData, // Add calculated rows
//     ]);
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, "MigrationData");
//     XLSX.writeFile(workbook, "MigrationData.xlsx");
//   };

//   return (
//     <div className="container">
//     <h1>Excel Migration Calculator</h1>
//     <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
//     {calculatedMigrationData && (
//       <div className="migration-data">
//         <h3>Migration Data Calculated:</h3>
//         <table>
//           <thead>
//             <tr>
//              <th>Segment</th>
//              <th>Not Due</th>
//              <th>1-29</th>
//              <th>30-59</th>
//              <th>60-89</th>
//              <th>90-119</th>
//              <th>120-149</th>
//              <th>150-179</th>
//              <th>180-209</th>
//              <th>210-239</th>
//              <th>240-269</th>
//              <th>270-299</th>
//              <th>300-329</th>
//              <th>330-359</th>
//              <th>360-389</th>
//              <th>390-419</th>
//              <th>420-449</th>
//              <th>450-479</th>
//              <th>480-509</th>
//              <th>510-539</th>
//              <th>540-569</th>
//              <th>570-599</th>
//              <th>600-629</th>
//              <th>630-659</th>
//              <th>660-689</th>
//              <th>690-719</th>
//              <th>720-749</th>
//              <th>750-779</th>
//              <th>Total</th>
             
//             </tr>
//           </thead>
//           <tbody>
//             {calculatedMigrationData.map((row, index) => (
//               <tr key={index}>
//                 {Object.values(row).map((value, i) => (
//                   <td key={i}>{value}</td>
//                 ))}
//               </tr>
//             ))}
//           </tbody>
//         </table>
//         <button onClick={downloadExcel}>Download Excel</button>
//       </div>
//     )}
//   </div>
  
//   );
// }

// export default App;
import React, { useState } from "react";
import * as XLSX from "xlsx";
import './App.css';

function App() {
  const [excelData, setExcelData] = useState(null);
  const [calculatedMigrationData, setCalculatedMigrationData] = useState(null);

  // Function to handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const binaryStr = event.target.result;
        const workbook = XLSX.read(binaryStr, { type: "binary" });

        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Define the options to skip the first row (header starts from A2)
        const options = {
          header: 1, // Take raw row data as an array, preserving headers
          range: 1, // Start from row 2 (0-indexed, so row 2 is 1)
        };

        // Convert the sheet to JSON with options
        const rawData = XLSX.utils.sheet_to_json(sheet, options);

        // Extract headers dynamically (from the second row)
        const headers = rawData[0];

        const nonHeaders = ["Date", "Segment", "Total"];
        const newHeader = headers.filter((item) => !nonHeaders.includes(item));

        // Extract the rest of the data starting from the second row
        const data = rawData
          .slice(1) // Extract rows starting from the second row
          .filter((row) => row.length > 0); // Remove empty arrays

        setExcelData({ headers, data });

        // Calculate migration data
        calculateMigration(data, headers);
      };

      reader.readAsBinaryString(file);
    }
  };

  const calculateMigration = (data, headers) => {
    const resultData = data
      .filter((_, rowIndex) => rowIndex !== 0) // Skip the first row entirely
      .map((row, rowIndex) => {
        return row
          .filter((_, colIndex) => colIndex > 1) // Skip the 'Date' and 'Segment' columns
          .map((cellValue, colIndex) => {
            const adjustedColIndex = colIndex + 3; // Adjust the column index since 'Date' and 'Segment' are removed
            const previousRowValue = data[rowIndex][adjustedColIndex - 2];
            const currentValue = parseFloat(cellValue) || 0;
            const previousValue = parseFloat(previousRowValue) || 0;

            // Avoid division by zero
            if (previousValue === 0) {
              return previousRowValue;
            }

            const migrationValue = currentValue / previousValue;

            // Return 1 if migration value is greater than 1, else return the value
            return migrationValue > 1 ? 1 : migrationValue.toFixed(5);
          });
      });

    setCalculatedMigrationData(resultData);
    calculateAveragePerSegment(resultData);
  };

  function calculateAveragePerSegment(data) {
    const newData = splitBySegments(data);
    const averages = {}; // To store the average values for each segment

    // Iterate over each segment in newData
    for (const segment in newData) {
      const segmentData = newData[segment];
      const columnCount = segmentData[0].length; // Get the number of columns
      const sums = Array(columnCount).fill(0); // Initialize sums for each column
      const rowCount = segmentData.length; // Get the number of rows in the segment

      // Sum values for each column
      segmentData.forEach(row => {
        row.forEach((value, index) => {
          sums[index] += parseFloat(value); // Sum the values column-wise
        });
      });

      // Calculate averages for each column
      const averagesForSegment = sums.map(sum => ((sum / rowCount) * 100).toFixed(2)); // Calculate average and fix to 2 decimal places
      averages[segment] = averagesForSegment; // Store averages in the averages object
    }

    // Set the averages to be displayed in the migration data table
    setCalculatedMigrationData(prevData => {
      const updatedData = [...prevData];

      // Add the averages row for each segment at the end
      for (const segment in averages) {
        const averageRow = ["Average", ...averages[segment]];
        updatedData.push(averageRow);
      }

      return updatedData;
    });
  }

  function splitBySegments(data) {
    const segmentGroups = {};

    data.forEach(row => {
      const segmentName = row[0]; // First element is the segment name
      const values = row.slice(1); // Rest are the values

      if (!segmentGroups[segmentName]) {
        segmentGroups[segmentName] = [];
      }

      // Add the row to the appropriate segment group
      segmentGroups[segmentName].push(values);
    });

    return segmentGroups;
  }

  // Function to download the calculated data as an Excel file
  const downloadExcel = () => {
    const worksheet = XLSX.utils.aoa_to_sheet([
      excelData.headers, // Add headers
      ...calculatedMigrationData, // Add calculated rows
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "MigrationData");
    XLSX.writeFile(workbook, "MigrationData.xlsx");
  };

  return (
    <div className="container">
      <h1>Excel Migration Calculator</h1>
      <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
      {calculatedMigrationData && (
        <div className="migration-data">
          <h3>Migration Data Calculated:</h3>
          <table>
            <thead>
              <tr>
                <th>Segment</th>
                <th>Not Due</th>
                <th>1-29</th>
                <th>30-59</th>
                <th>60-89</th>
                <th>90-119</th>
                <th>120-149</th>
                <th>150-179</th>
                <th>180-209</th>
                <th>210-239</th>
                <th>240-269</th>
                <th>270-299</th>
                <th>300-329</th>
                <th>330-359</th>
                <th>360-389</th>
                <th>390-419</th>
                <th>420-449</th>
                <th>450-479</th>
                <th>480-509</th>
                <th>510-539</th>
                <th>540-569</th>
                <th>570-599</th>
                <th>600-629</th>
                <th>630-659</th>
                <th>660-689</th>
                <th>690-719</th>
                <th>720-749</th>
                <th>750-779</th>
              </tr>
            </thead>
            <tbody>
              {calculatedMigrationData.map((row, index) => (
                <tr key={index}>
                  {Object.values(row).map((value, i) => (
                    <td key={i}>{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={downloadExcel}>Download Excel</button>
        </div>
      )}
    </div>
  );
}

export default App;
