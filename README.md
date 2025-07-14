# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/99dba88b-f3d1-438a-a372-5c4ab2482124

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/99dba88b-f3d1-438a-a372-5c4ab2482124) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/99dba88b-f3d1-438a-a372-5c4ab2482124) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Activity Logs

The dashboard keeps a running history of actions in the **Logs** tab. You can download this history using **Export Logs** or remove it entirely using the new **Clear Logs** button next to the export option.

## Server configuration

The Node.js server polls GitHub for repository updates. The polling interval can
be tuned with the `POLL_INTERVAL_MS` environment variable (default: `60000` ms).
Webhook configurations are stored in `server/webhooks.json`. Set the
`WEBHOOK_STORAGE_PATH` variable to change this location.

When a pull request is opened, closed, merged or a security alert appears,
socket clients subscribed via the `subscribeRepo` message receive a `repoUpdate`
payload and any active webhooks are triggered. The subscribe call may include
configuration such as protected branch patterns, allowed users or minimum alert
severity. These settings influence polling and security filtering on the server.

### Caching

The server keeps a short-lived cache of recent pull requests, stray branches and
activity events for each watched repository. Results fetched during polling are
stored on the watcher and sent to newly subscribed sockets via the `repoCache`
event. If GitHub requests fail, these cached values are returned so the UI can
continue operating while offline.

### Configuration sync

After a client pairs with the server it should emit a `syncConfig` Socket.IO
message containing its configuration (for example a list of protected branch
patterns). The server stores this data per client in `server/config.json` and
uses the settings when handling actions such as `fetchStrayBranches` and
`deleteBranch`. The file persists across restarts so important settings remain
available.

## Running the server and UI together

1. Build the server TypeScript once:

   ```bash
   npm run build:server
   ```

2. Start the Node.js server using the compiled files:

   ```bash
   npm run server
   ```

   The server listens on `PORT` (default `3001`). You may also customise
   `POLL_INTERVAL_MS`, `CACHE_TTL_MS`, `WEBHOOK_STORAGE_PATH` and `PAIR_SECRET`
   using environment variables.

3. In a separate terminal start the Vite dev server for the UI:

   ```bash
   npm run dev
   ```

   The UI communicates with the Node server via WebSockets. GitHub Personal
   Access Tokens can be provided through the UI itself or by setting the
   `GITHUB_TOKEN` environment variable before starting the server.
