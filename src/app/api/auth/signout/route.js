import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // In a token-based system where the token is stored client-side (e.g., localStorage),
    // the primary responsibility of signout is on the client to clear the token.
    // This server route can confirm the action or perform server-side session cleanup if any.

    // If using HttpOnly cookies for tokens, this is where you would clear the cookie:
    // const response = NextResponse.json({ message: 'Sign out successful.' });
    // response.cookies.set('token', '', { httpOnly: true, expires: new Date(0), path: '/' });
    // return response;

    return NextResponse.json({ message: 'Sign out successful. Please clear your token on the client side.' }, { status: 200 });

  } catch (error) {
    console.error('Signout API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
