import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { ingredientName, owned, userId, sessionId, quantity, unit } = body;

        if (!ingredientName) {
            return NextResponse.json(
                { error: 'Ingredient name is required' },
                { status: 400 }
            );
        }

        const normalizedName = ingredientName.toLowerCase().trim();

        // Build OR conditions for user/session
        const orConditions = [];
        if (userId) orConditions.push({ userId });
        if (sessionId) orConditions.push({ sessionId });

        if (orConditions.length === 0) {
            return NextResponse.json(
                { error: 'userId or sessionId required' },
                { status: 400 }
            );
        }

        // Check if item already exists in pantry
        const existing = await prisma.userPantry.findFirst({
            where: {
                ingredientName: normalizedName,
                OR: orConditions,
            },
        });

        if (owned) {
            // Add or update pantry item
            if (existing) {
                await prisma.userPantry.update({
                    where: { id: existing.id },
                    data: {
                        isAvailable: true,
                        quantity: quantity || existing.quantity,
                        unit: unit || existing.unit,
                    },
                });
            } else {
                await prisma.userPantry.create({
                    data: {
                        ingredientName: normalizedName,
                        userId,
                        sessionId,
                        quantity,
                        unit,
                        isAvailable: true,
                    },
                });
            }
        } else {
            // Remove from pantry (mark as unavailable)
            if (existing) {
                await prisma.userPantry.update({
                    where: { id: existing.id },
                    data: { isAvailable: false },
                });
            }
        }

        return NextResponse.json({
            success: true,
            ingredientName: normalizedName,
            owned,
        });
    } catch (error) {
        logger.error('Pantry toggle error', { error }, 'PantryAPI');
        return NextResponse.json(
            { error: 'Failed to update pantry' },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const sessionId = searchParams.get('sessionId');

        if (!userId && !sessionId) {
            return NextResponse.json(
                { error: 'userId or sessionId required' },
                { status: 400 }
            );
        }

        // Build OR conditions for user/session
        const orConditions = [];
        if (userId) orConditions.push({ userId });
        if (sessionId) orConditions.push({ sessionId });

        const items = await prisma.userPantry.findMany({
            where: {
                isAvailable: true,
                OR: orConditions,
            },
            orderBy: { addedAt: 'desc' },
        });

        return NextResponse.json({
            items: items.map((item: any) => ({
                id: item.id,
                ingredientName: item.ingredientName,
                quantity: item.quantity ? Number(item.quantity) : null,
                unit: item.unit,
                addedAt: item.addedAt,
            })),
            count: items.length,
        });
    } catch (error) {
        logger.error('Pantry fetch error', { error }, 'PantryAPI');
        return NextResponse.json(
            { error: 'Failed to fetch pantry' },
            { status: 500 }
        );
    }
}
