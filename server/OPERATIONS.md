# Production operations

## Health checks

- Public readiness: `GET /api/health`
- Authenticated diagnostics: **Admin → System Health**
- Investigate unresolved operational events before marking them resolved.

## Database backup and recovery

1. Keep Supabase automated backups enabled for the production project.
2. Before a destructive migration, create a manual backup from the Supabase dashboard.
3. Test restoration into a separate project at least quarterly; never test a restore over production.
4. Record the backup timestamp, migration commit, restore target, and verification result.
5. After restoration, verify customer/order counts, recent paid orders, admin login, and `/api/health` before changing DNS or environment variables.

## Scheduled maintenance

Run from the `server` directory using the production database environment:

```powershell
npm.cmd run maintenance
```

This clears expired admin-reset tokens, stale unverified-customer tokens, and operational events resolved more than 90 days ago. Schedule it daily using a trusted job runner; it does not delete orders, payments, customers, artworks, or commissions.

## Incident response

1. Preserve logs and note the first observed timestamp.
2. Disable affected credentials or integrations in Vercel when compromise is suspected.
3. Rotate `JWT_SECRET` only when session invalidation is intended.
4. Rotate email/Paystack credentials at their providers, then update Vercel and redeploy.
5. Reconcile Paystack transactions against paid orders before manually changing payment status.
