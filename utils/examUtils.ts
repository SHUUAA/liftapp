export const generateRowId = () => `row_${new Date().getTime()}_${Math.random().toString(36).substring(2, 9)}`;
