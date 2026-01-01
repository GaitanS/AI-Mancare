
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// For this prototype, we'll use a fixed demo user ID.
// In a real app, this would come from a session/auth provider.
const DEMO_USER_ID = 'demo-user-123';
const DEMO_USER_EMAIL = 'demo@retete-ieftine.ro';

export async function GET(request: NextRequest) {
    try {
        // Try to find the demo user
        let user = await prisma.user.findUnique({
            where: { id: DEMO_USER_ID },
        });

        // If not found, create it (lazy init for the prototype)
        if (!user) {
            // Check if email exists to avoid unique constraint error if ID matches but email differs (unlikely for fixed ID)
            const existingEmail = await prisma.user.findUnique({ where: { email: DEMO_USER_EMAIL } });
            if (existingEmail) {
                user = existingEmail;
            } else {
                user = await prisma.user.create({
                    data: {
                        id: DEMO_USER_ID,
                        email: DEMO_USER_EMAIL,
                        householdSize: 2,
                        dietaryRestrictions: JSON.stringify([]),
                        nutritionalGoals: JSON.stringify([]),
                        preferredStores: JSON.stringify(['Lidl', 'Kaufland']),
                    },
                });
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                id: user.id,
                email: user.email,
                householdSize: user.householdSize,
                dietaryRestrictions: user.dietaryRestrictions ? JSON.parse(user.dietaryRestrictions) : [],
                nutritionalGoals: user.nutritionalGoals ? JSON.parse(user.nutritionalGoals) : [],
                preferredStores: user.preferredStores ? JSON.parse(user.preferredStores) : [],
                budgetPreference: user.budgetPreference,
            },
        });

    } catch (error) {
        console.error('Error fetching profile:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch profile' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Normalize fields for JSON storage
        const updateData: any = {};

        if (body.householdSize !== undefined) {
            updateData.householdSize = body.householdSize;
        }

        if (body.dietaryRestrictions) {
            updateData.dietaryRestrictions = JSON.stringify(body.dietaryRestrictions);
        }

        if (body.nutritionalGoals) {
            updateData.nutritionalGoals = JSON.stringify(body.nutritionalGoals);
        }

        if (body.preferredStores) {
            updateData.preferredStores = JSON.stringify(body.preferredStores);
        }

        if (body.budgetPreference) {
            updateData.budgetPreference = body.budgetPreference;
        }

        const user = await prisma.user.upsert({
            where: { id: DEMO_USER_ID },
            update: updateData,
            create: {
                id: DEMO_USER_ID,
                email: DEMO_USER_EMAIL,
                householdSize: body.householdSize || 2,
                dietaryRestrictions: JSON.stringify(body.dietaryRestrictions || []),
                nutritionalGoals: JSON.stringify(body.nutritionalGoals || []),
                preferredStores: JSON.stringify(body.preferredStores || ['Lidl', 'Kaufland']),
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                id: user.id,
                householdSize: user.householdSize,
                dietaryRestrictions: user.dietaryRestrictions ? JSON.parse(user.dietaryRestrictions) : [],
                nutritionalGoals: user.nutritionalGoals ? JSON.parse(user.nutritionalGoals) : [],
                preferredStores: user.preferredStores ? JSON.parse(user.preferredStores) : [],
                budgetPreference: user.budgetPreference
            },
        });

    } catch (error) {
        console.error('Error updating profile:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update profile' },
            { status: 500 }
        );
    }
}
