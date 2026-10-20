/**
 * Repeater Position Estimation (Trilateration) & Trajectory Engine
 * Implements RSSI Log-Distance Path Loss model and Weighted Centroid.
 */

const TrilaterationEngine = {
  /**
   * Estimates repeater position from historical direct receptions (0-hop)
   */
  calculateEstimatedRepeaterLocation(targetNodeId, allLogs) {
    if (!targetNodeId || !allLogs || allLogs.length === 0) return null;

    const cleanTarget = targetNodeId.toUpperCase().trim();

    // Filter receptions that match target ID and are direct (0-hop) with valid GPS
    const relevantLogs = allLogs.filter(log => {
      const matchId = log.nodeId && log.nodeId.toUpperCase().trim() === cleanTarget;
      const isDirect = !log.meshPacket || log.meshPacket.hopCount === 0 || !log.meshPacket.path || log.meshPacket.path.length === 0;
      const hasGps = log.lat !== 0 && log.lng !== 0;
      return matchId && isDirect && hasGps;
    });

    if (relevantLogs.length < 3) {
      return null; // Need at least 3 receptions for trilateration
    }

    let totalWeight = 0;
    let weightedLatSum = 0;
    let weightedLonSum = 0;
    const distances = [];

    // RSSI Log-Distance Path Loss Model parameters
    const refRssi = -45.0; // RSSI at 1 meter
    const pathLossExp = 2.7; // Path loss exponent

    relevantLogs.forEach(log => {
      const rssi = log.rssi;
      const estimatedDistMeters = Math.pow(10, (refRssi - rssi) / (10.0 * pathLossExp));
      distances.push(estimatedDistMeters);

      const weight = 1.0 / Math.pow(Math.max(estimatedDistMeters, 1.0), 2);
      totalWeight += weight;
      weightedLatSum += log.lat * weight;
      weightedLonSum += log.lng * weight;
    });

    if (totalWeight <= 0) return null;

    const estLat = weightedLatSum / totalWeight;
    const estLon = weightedLonSum / totalWeight;

    // Calculate weighted average distance for confidence radius
    let weightedDistSum = 0;
    relevantLogs.forEach((log, idx) => {
      const weight = 1.0 / Math.pow(Math.max(distances[idx], 1.0), 2);
      weightedDistSum += distances[idx] * weight;
    });
    const avgEstDist = weightedDistSum / totalWeight;
    const confidenceRadiusMeters = Math.min(2500, Math.max(50, avgEstDist * 0.7));

    return {
      targetNodeId: cleanTarget,
      estimatedPos: { lat: estLat, lng: estLon },
      confidenceRadiusMeters,
      sampleCount: relevantLogs.length
    };
  }
};

window.TrilaterationEngine = TrilaterationEngine;
