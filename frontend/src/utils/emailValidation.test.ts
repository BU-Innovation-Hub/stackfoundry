import { isBothoUniversityEmail } from './emailValidation';

describe('Botho email domains', () => {
  it.each([
    'rethabile.lebele@bothouniversity.com',
    'rethabile.lebele@bothouniversity.ac.bw',
    '  RETHABILE.LEBELE@BOTHOUNIVERSITY.COM  ',
  ])('accepts permitted Botho email %s', email => {
    expect(isBothoUniversityEmail(email)).toBe(true);
  });

  it.each(['user@gmail.com', 'user@sub.bothouniversity.com', 'user@bothouniversity.com.example', 'user..name@bothouniversity.com', 'invalid'])('rejects %s', email => {
    expect(isBothoUniversityEmail(email)).toBe(false);
  });
});
