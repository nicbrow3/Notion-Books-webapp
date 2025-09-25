/**
 * Logout user (stateless - just indicates success)
 * @returns {Promise<Object>} Logout result
 */
const logoutUser = async () => {
  return {
    success: true,
    message: 'Successfully logged out'
  };
};

module.exports = {
  logoutUser
};