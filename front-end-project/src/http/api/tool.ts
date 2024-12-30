import serviceAxios from '../index';

export const translateText = (data?) => {
  return serviceAxios({
    url: '/api/tool/translate',
    method: 'post',
    data,
  });
};
