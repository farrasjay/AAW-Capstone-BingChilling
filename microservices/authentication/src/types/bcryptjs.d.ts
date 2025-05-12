// src/types/bcryptjs.d.ts
declare module 'bcryptjs' {
  function hash(data: string | Buffer, salt: string | number): Promise<string>;
  function hashSync(data: string | Buffer, salt: string | number): string;
  function compare(data: string | Buffer, encrypted: string): Promise<boolean>;
  function compareSync(data: string | Buffer, encrypted: string): boolean;
  function getRounds(encrypted: string): number;
  function getSalt(encrypted: string): string;
  function genSalt(rounds?: number, minor?: 'a' | 'b'): Promise<string>;
  function genSaltSync(rounds?: number, minor?: 'a' | 'b'): string;

  const bcrypt: {
    hash: typeof hash;
    hashSync: typeof hashSync;
    compare: typeof compare;
    compareSync: typeof compareSync;
    getRounds: typeof getRounds;
    getSalt: typeof getSalt;
    genSalt: typeof genSalt;
    genSaltSync: typeof genSaltSync;
  };

  export = bcrypt;
}