# Database Migration Scripts

## Modul Types Migration

### Overview

This migration updates existing agents in the database from old modul type names to new, more descriptive names.

### Changes Made

- `GAME_FI_NPC` → `GAMING_BUDDY` (Interactive gaming system)
- `DEFI_AI` → `TRADING_ASSISTANT` (AI-powered trading bot)
- `ORACLE_FEED` → `PORTFOLIO_WATCHER` (Portfolio tracking)
- `MEME` → `MEME` (unchanged - meme token with analytics)
- `CUSTOM` → `SOCIAL_SENTINEL` (Social media data gathering)

### New Modul Type Descriptions

1. **GAMING_BUDDY**: Interactive gaming system that presents various games and entertainment options to users
2. **TRADING_ASSISTANT**: AI-powered trading bot that analyzes markets, executes trades, and provides insights
3. **MEME**: Viral meme token with trading metrics, holder analytics, and community hype tracking
4. **PORTFOLIO_WATCHER**: Tracks portfolio performance across multiple chains and provides insights
5. **SOCIAL_SENTINEL**: Gathers social media data based on keywords and topics, providing insights through a chat interface

### Running the Migration

1. **Ensure your environment is set up:**

   ```bash
   cd backend
   npm install
   ```

2. **Run the migration:**

   ```bash
   npm run migrate:modul-types
   ```

3. **Verify the migration:**
   The script will output the results and show how many agents were migrated.

### What the Migration Does

- Finds all agents with old modul type values
- Updates them to the new values
- Adds a migration log entry for audit purposes
- Verifies that all agents have been successfully migrated

### Rollback

If you need to rollback, you can manually update the agents back to their original values or create a reverse migration script.

### Safety

- The migration is safe and won't delete any data
- It only updates the `modulType` field
- All other agent data remains intact
- A migration log is added for tracking purposes
