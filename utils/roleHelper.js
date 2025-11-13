/**
 * Helper functions for role checking
 */

/**
 * Check if user is vendor or individual
 * @param {Object} user - User object
 * @returns {Boolean}
 */
const isVendorOrIndividual = (user) => {
  return user && (user.role === 'vendor' || user.role === 'individual');
};

/**
 * Check if user is vendor
 * @param {Object} user - User object
 * @returns {Boolean}
 */
const isVendor = (user) => {
  return user && user.role === 'vendor';
};

/**
 * Check if user is individual
 * @param {Object} user - User object
 * @returns {Boolean}
 */
const isIndividual = (user) => {
  return user && user.role === 'individual';
};

/**
 * Check if user is admin or superadmin
 * @param {Object} user - User object
 * @returns {Boolean}
 */
const isAdminUser = (user) => {
  return user && (user.role === 'admin' || user.role === 'superadmin');
};

/**
 * Get business type from KYC (vendor or individual)
 * @param {Object} kyc - KYC object
 * @returns {String} - 'vendor' or 'individual'
 */
const getBusinessType = (kyc) => {
  if (kyc.businessType) {
    return kyc.businessType;
  }
  // Fallback: check GST
  return (kyc.gstNumber && kyc.gstNumber.trim()) ? 'vendor' : 'individual';
};

module.exports = {
  isVendorOrIndividual,
  isVendor,
  isIndividual,
  isAdminUser,
  getBusinessType
};

