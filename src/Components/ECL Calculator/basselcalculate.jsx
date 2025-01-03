import React, { useEffect, useState } from 'react';
import { jStat } from 'jstat';

const BaselCorrelationCalculator = ({ 
  calculatedLossRates, 
  segmentStorage, 
  bucketOptions, 
  onCalculate 
}) => {
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // Add input validation
  useEffect(() => {
    if (!calculatedLossRates || !segmentStorage || !bucketOptions) {
      console.warn('Missing required props:', { 
        hasLossRates: !!calculatedLossRates, 
        hasSegmentStorage: !!segmentStorage, 
        hasBucketOptions: !!bucketOptions 
      });
    }
  }, [calculatedLossRates, segmentStorage, bucketOptions]);

  const calculateECLScenario = (pd, lgd, ead, assetCorrelation, scenarioValue) => {
    try {
      // Validate inputs
      if (!pd || !lgd || !ead || !assetCorrelation || scenarioValue === undefined) {
        console.warn('Missing inputs:', { pd, lgd, ead, assetCorrelation, scenarioValue });
        return null;
      }

      if (pd <= 0 || pd >= 1 || lgd <= 0 || lgd > 1 || ead <= 0) {
        console.warn('Invalid input ranges:', { pd, lgd, ead });
        return null;
      }

      
      if (assetCorrelation <= 0 || assetCorrelation >= 1) {
        console.warn('Invalid asset correlation:', assetCorrelation);
        return null;
      }

      console.log(`Segment: ${segment}, Loss Rate: ${lossRate}, LGD: ${lgd}, EAD: ${ead}`);
console.log(`Segment Values:`, segmentValues);

      

      const normInvPD = jStat.normal.inv(pd, 0, 1);
      const sqrtAssetCorrelation = Math.sqrt(assetCorrelation);
      const sqrtInverseAssetCorrelation = Math.sqrt(1 - assetCorrelation);

      const zScore = (normInvPD - sqrtAssetCorrelation * scenarioValue) / sqrtInverseAssetCorrelation;
      const stressedPD = jStat.normal.cdf(zScore, 0, 1);

      return stressedPD * lgd * ead;
      
    } catch (error) {
      console.error('ECL scenario calculation error:', error);
      return null;
    }
    
  };

  const calculateECL = () => {
    try {
      // Input validation
      if (!calculatedLossRates || !segmentStorage || !bucketOptions) {
        setError('Missing required data for ECL calculation');
        return;
      }

      const eclResults = {};
      let hasValidResults = false;

      Object.entries(calculatedLossRates).forEach(([segment, lossRates]) => {
        const segmentValues = segmentStorage[segment];

        if (!segmentValues || !Array.isArray(lossRates)) {
          console.warn(`Invalid data for segment: ${segment}`);
          return;
        }

        const segmentResults = {
          segment,
          buckets: bucketOptions,
          lossRates: [],
          eclBaseCase: [],
          eclBestCase: [],
          eclWorstCase: []
        };
      
        
        lossRates.forEach((rateData) => {
          // Ensure we have valid loss rate data
          if (!rateData || typeof rateData !== 'object') {
            console.warn('Invalid loss rate data:', rateData);
            return;
          }
        
          const { lossRate, lgd, ead } = rateData;
        
          // Calculate asset correlation
          const assetCorrelation = 0.03 * (1 - Math.exp(-35 * pd)) / (1 - Math.exp(-35)) +
                                   0.16 * (1 - (1 - Math.exp(-35 * pd)) / (1 - Math.exp(-35)));

          
                                   
        
          // Validate scenario values
          if (!segmentValues.base || !segmentValues.best || !segmentValues.worst) {
            console.warn('Missing scenario values:', segmentValues);
            return;
          }
        
          // Calculate ECL scenarios
          const baseECL = calculateECLScenario(pd, lgd, ead, assetCorrelation, segmentValues.base);
          const bestECL = calculateECLScenario(pd, lgd, ead, assetCorrelation, segmentValues.best);
          const worstECL = calculateECLScenario(pd, lgd, ead, assetCorrelation, segmentValues.worst);

        
          // Only add results if all calculations were successful
          if (baseECL !== null && bestECL !== null && worstECL !== null) {
            segmentResults.lossRates.push(lossRate);
            segmentResults.eclBaseCase.push(baseECL.toFixed(2)); // This line should not throw an error
            segmentResults.eclBestCase.push(bestECL.toFixed(2)); // Same for this
            segmentResults.eclWorstCase.push(worstECL.toFixed(2)); // Same for this
            hasValidResults = true;
          }
        });
        

        if (segmentResults.lossRates.length > 0) {
          eclResults[segment] = segmentResults;
        }

        console.log('Segment Results:', segmentResults);
    

      });

      if (!hasValidResults) {
        setError('No valid results were calculated');
        return;
      }

      setResults(eclResults);
      onCalculate(eclResults);
      setError(null);
    } catch (error) {
      console.error('ECL calculation error:', error);
      setError('Failed to calculate ECL');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button
          onClick={calculateECL}
          disabled={!calculatedLossRates || !segmentStorage || !bucketOptions}
          className={`px-4 py-2 rounded transition-colors ${
            !calculatedLossRates || !segmentStorage || !bucketOptions
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          Calculate ECL
        </button>
        
        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</div>
        )}
      </div>

      {results && Object.keys(results).length > 0 ? (
  <div className="overflow-x-auto rounded-lg border border-gray-200">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Segment</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bucket</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loss Rate (%)</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base ECL</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Best ECL</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Worst ECL</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {Object.entries(results).map(([segmentName, segmentData]) => (
          segmentData.buckets.map((bucket, index) => (
            <tr key={`${segmentName}-${bucket}`} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{segmentName}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bucket}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{segmentData.lossRates[index]}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{segmentData.eclBaseCase[index]}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{segmentData.eclBestCase[index]}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{segmentData.eclWorstCase[index]}</td>
            </tr>
          ))
        ))}
      </tbody>
    </table>
  </div>
) : (
  <div className="text-gray-500">No results to display</div>
)}

    </div>
  );
};

export default BaselCorrelationCalculator;