import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    if (!supabaseUrl || !supabaseKey) {
        return supabaseResponse;
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // refreshing the auth token
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
        // Enforce Onboarding
        // Check if profile is complete
        const { data: profile } = await supabase
            .from('profiles')
            .select('birth_date, gender')
            .eq('id', user.id)
            .single();

        // If specific fields are missing, redirect to onboarding
        // Note: height_cm might be 0, but usually not null if defaults are used. 
        // We check for birth_date specifically as the new required field.
        const isProfileIncomplete = !profile || !profile.birth_date || !profile.gender;

        const path = request.nextUrl.pathname;
        const isExcluded =
            path.startsWith('/onboarding') ||
            path.startsWith('/api') ||
            path.startsWith('/auth') ||
            path.startsWith('/_next') ||
            path.startsWith('/static') ||
            path === '/login';

        if (isProfileIncomplete && !isExcluded) {
            const url = request.nextUrl.clone()
            url.pathname = '/onboarding'

            const redirectResponse = NextResponse.redirect(url)

            // Copy cookies from supabaseResponse (which might have refreshed tokens) to redirectResponse
            const cookiesToSet = supabaseResponse.cookies.getAll()
            cookiesToSet.forEach(cookie => {
                redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
            })

            return redirectResponse
        }
    }

    return supabaseResponse
}
