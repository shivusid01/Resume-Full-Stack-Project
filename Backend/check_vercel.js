async function checkVercelScript() {
  try {
    const res = await fetch("https://ai-placement-preparation-project.vercel.app");
    const html = await res.text();
    const scripts = html.match(/src="[^"]+"/g);
    console.log("Live Vercel JS files:", scripts);

    if (scripts && scripts[0]) {
      const scriptPath = scripts[0].replace('src="', '').replace('"', '');
      const jsRes = await fetch(`https://ai-placement-preparation-project.vercel.app${scriptPath}`);
      const js = await jsRes.text();
      const hasRenderUrl = js.includes("ai-placement-preparation.onrender.com");
      console.log("Does live JS bundle contain Render URL?", hasRenderUrl);
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}

checkVercelScript();
