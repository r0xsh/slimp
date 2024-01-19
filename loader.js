const slimpDo = () => {
    const regex = /authorization-token=([a-z0-9]+);/gm;
    const matches = document.cookie.matchAll(regex);
    for (const match of matches) {
        // Output only the capturing group with the token
        console.log(`Authorization token found: ${match[1]}`);
    }
}
window.slimpDo = slimpDo
