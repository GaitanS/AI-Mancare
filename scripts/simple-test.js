
console.log("SIMPLE TEST STARTING");

async function run() {
    try {
        console.log("Fetching kimbino...");
        const res = await fetch('https://kimbino.ro/kaufland/');
        console.log("Status:", res.status);
        const text = await res.text();
        console.log("HTML length:", text.length);
        if (text.length < 1000) console.log("Body preview:", text);
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

run();
