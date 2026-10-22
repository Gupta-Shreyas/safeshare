# SafeShare

Blockchain-based community emergency resource network. Communities share generators, pumps, first-aid kits and other
resources with a trusted record of who owns what, who borrowed it, and how it was returned.

## How it works

- **Smart contract (Solidity, Hardhat):** admin-verified users, starting credits used as deposits, the full resource
  lifecycle (request, approve, checkout, return, dispute), emergency pause, blacklist, and on-chain trust counters.
- **Web app (Next.js, TypeScript):** sessions, admin panel, photo upload, signed QR check-out and return, live blockchain page.
- **Tamper detection:** titles, descriptions and photos stay in the database. Only their keccak256 hashes go on-chain, so any
  later edit shows a red TAMPERED badge.

## Security features

- Passwords hashed with bcrypt, lockout after 5 failed logins, per-IP rate limiting, and a generic login error message.
- HTTP-only, SameSite=Strict session cookies, an Origin check on all writes, and a content security policy.
- Input validation with zod, parameterized SQL, and uploads checked by real file signature.
- QR codes signed with HMAC, bound to one borrower and one item, and expiring after 10 minutes.
- Sybil defense: unverified wallets cannot register or borrow. Role checks on every admin route plus an audit log.

## Run locally (Node 20)

Terminal 1, the local blockchain:

    cd contracts
    npm install
    npx hardhat node

Terminal 2, deploy the contract (the first deploy gets the same address every time on a fresh node):

    cd contracts
    npx hardhat run scripts/deploy.ts --network localhost

Terminal 3, the website:

    cd web
    npm install
    copy .env.example .env.local
    npm run dev

Then put two different random strings into `JWT_SECRET` and `QR_SIGNING_SECRET` in `.env.local`. Generate each with:

    node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"

Open http://localhost:3000. A demo admin is seeded on first run (`admin` / `Admin@12345`). This is for local demos only, so
change it before any real use.

## Honest limits

The server signs transactions with local test accounts. A production version would have users sign with their own wallet.
The rate limiter is in memory, and the database is SQLite compiled to WebAssembly.