export const tokenCache = {
  getToken: (key: string): Promise<string | null> =>
    Promise.resolve(localStorage.getItem(key)),
  saveToken: (key: string, value: string): Promise<void> => {
    localStorage.setItem(key, value);
    return Promise.resolve();
  },
  clearToken: (key: string): Promise<void> => {
    localStorage.removeItem(key);
    return Promise.resolve();
  },
};
