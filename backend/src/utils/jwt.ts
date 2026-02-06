import { SignOptions, sign, verify } from "jsonwebtoken";

export interface JwtUserPayload {
  sub: string; // user id
  email?: string;
  roles?: string[];
}

export const signToken = (payload: JwtUserPayload, secret: string, expiresInSeconds = 60 * 60 * 24 * 7) => {
  const options: SignOptions = { expiresIn: expiresInSeconds };
  return sign(payload, secret, options);
};

export const verifyToken = (token: string, secret: string): JwtUserPayload => {
  return verify(token, secret) as JwtUserPayload;
};
