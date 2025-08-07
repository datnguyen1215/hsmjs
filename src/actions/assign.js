/**
 * @param {Function|Object} assigner
 * @returns {Object}
 */
export const assign = (assigner) => ({
  _isAssign: true,
  assigner
});

/**
 * @param {Object} action
 * @returns {boolean}
 */
export const isAssignAction = (action) => action?._isAssign === true;