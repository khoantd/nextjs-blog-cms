
const { encode } = require('next-auth/jwt');

const secret = process.env.NEXTAUTH_SECRET || "kqx/VLLjMY2tlqP86ObHWG2ia1Jt5Tf+XpPR8vGm+Mo=";

async function generateToken() {
    const token = await encode({
        token: {
            name: "MCP Agent",
            email: "agent@fastmcp.local",
            sub: "fastmcp-agent",
            role: "editor", // Need editor role
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60),
        },
        secret,
    });

    console.log(token);
}

generateToken().catch(console.error);
