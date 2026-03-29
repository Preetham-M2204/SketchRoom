import api from './axios'

/**
 * Get AI analysis for Decision Board
 * Sends all pros/cons/strengths/weaknesses to Claude for strategic summary
 * @param {Object} decisionData - { topic, items: [...], votes: {...} }
 * @returns {Promise<string>} Claude's analysis text
 */
export const getDecisionAnalysis = async (decisionData) => {
  try {
    const response = await api.post('/ai/decision-analysis', decisionData)
    return response.data.analysis
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to get AI analysis')
  }
}

/**
 * Get AI summary for GD Round
 * Sends speaker list, scores, and key points to Claude for session summary
 * @param {Object} gdData - { speakers: [...], scores: {...}, duration }
 * @returns {Promise<string>} Claude's summary text
 */
export const getGdSummary = async (gdData) => {
  try {
    const response = await api.post('/ai/gd-summary', gdData)
    return response.data.summary
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to get GD summary')
  }
}
