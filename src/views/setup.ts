export function setupView({
  name,
  description,
  version,
  createAppUrl,
  manifest,
}: {
  name?: string | undefined;
  description?: string | undefined;
  version?: string | undefined;
  createAppUrl: string | undefined;
  manifest: string | undefined;
}): string {
  return `<!DOCTYPE html>
<!DOCTYPE html>
<html lang="en" class="height-full" data-color-mode="auto" data-light-theme="light" data-dark-theme="dark">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Setup ${name || "Your App"} | built with Probot</title>
    <link rel="icon" href="/probot/static/probot-head.png">
    <link rel="stylesheet" href="/probot/static/primer.css">
  </head>
  <body class="height-full bg-gray-light">
    <div class="d-flex flex-column flex-justify-center flex-items-center text-center height-full">
      <img src="/probot/static/robot.svg" alt="Probot Logo" width="100" class="mb-6">
      <div class="box-shadow rounded-2 border p-6 bg-white">
        <h1>
          Welcome to ${name || "your Probot App"}
          ${
            version
              ? `<span class="Label Label--outline v-align-middle ml-2 text-gray-light">v${version}</span>`
              : ""
          }
        </h1>

        <p>${
          description
            ? description
            : 'This app was built using <a href="https://github.com/probot/probot">Probot</a>, a framework for building GitHub Apps.'
        }</p>

        <div class="text-left mt-6">
          <h2 class="alt-h3 mb-2">Getting Started</h2>

          <p>To start building a GitHub App, you'll need to register a new app on GitHub.</p>
          <br>

          <form action="${createAppUrl}" method="post" target="_blank" class="d-flex flex-items-center">
            <button class="btn btn-outline" name="manifest" id="manifest" value='${manifest}' >Register GitHub App</button>
            <a href="/probot/import" class="ml-2">or use an existing Github App</a>
          </form>
        </div>
      </div>

      <div class="mt-4">
        <h4 class="alt-h4 text-gray-light">Need help?</h4>
        <div class="d-flex flex-justify-center mt-2">
          <a href="https://probot.github.io/docs/" class="btn btn-outline mr-2">Documentation</a>
          <a href="https://github.com/probot/probot/discussions" class="btn btn-outline">Discuss on GitHub</a>
        </div>
      </div>
    </div>
  </body>
</html>`;
}
