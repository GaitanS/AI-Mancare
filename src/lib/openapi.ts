/**
 * OpenAPI Specification for Rețete Ieftine API
 * Skill: api-documentation
 */

export const openApiSpec = {
    openapi: '3.0.3',
    info: {
        title: 'Rețete Ieftine API',
        description: 'API pentru agregarea ofertelor din supermarketuri și generarea de rețete economice folosind AI.',
        version: '2.0.0',
        contact: {
            name: 'Rețete Ieftine',
            url: 'https://retete-ieftine.ro'
        }
    },
    servers: [
        {
            url: 'https://retete-ieftine.ro/api',
            description: 'Production'
        },
        {
            url: 'http://localhost:3000/api',
            description: 'Development'
        }
    ],
    tags: [
        { name: 'Products', description: 'Produse/oferte din cataloage' },
        { name: 'Recipes', description: 'Rețete generate' },
        { name: 'Catalogs', description: 'Cataloage supermarketuri' },
        { name: 'System', description: 'Endpoint-uri sistem' }
    ],
    paths: {
        '/v2/oferte': {
            get: {
                tags: ['Products'],
                summary: 'Listare produse/oferte',
                description: 'Returnează lista de produse din cataloage cu filtrare și paginare.',
                parameters: [
                    { name: 'page', in: 'query', schema: { type: 'integer', default: 1, minimum: 1 } },
                    { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, minimum: 1, maximum: 100 } },
                    { name: 'store', in: 'query', schema: { type: 'string' }, description: 'Filtrare după magazin' },
                    { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Filtrare după categorie' },
                    { name: 'minPrice', in: 'query', schema: { type: 'number' } },
                    { name: 'maxPrice', in: 'query', schema: { type: 'number' } },
                    { name: 'minDiscount', in: 'query', schema: { type: 'integer', minimum: 0, maximum: 100 } },
                    { name: 'validOnly', in: 'query', schema: { type: 'boolean', default: true } },
                    { name: 'sortBy', in: 'query', schema: { type: 'string', enum: ['price', 'discount', 'createdAt', 'name'] } },
                    { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } }
                ],
                responses: {
                    '200': {
                        description: 'Lista de produse',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/PaginatedProducts' }
                            }
                        }
                    },
                    '422': { $ref: '#/components/responses/ValidationError' },
                    '429': { $ref: '#/components/responses/RateLimitError' }
                }
            }
        },
        '/v2/oferte/trending': {
            get: {
                tags: ['Products'],
                summary: 'Produse trending',
                description: 'Returnează produsele cu cel mai mare discount, valabile în prezent.',
                parameters: [
                    { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, maximum: 50 } }
                ],
                responses: {
                    '200': {
                        description: 'Lista de produse trending',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ProductList' }
                            }
                        }
                    }
                }
            }
        },
        '/v2/oferte/stats': {
            get: {
                tags: ['Products'],
                summary: 'Statistici produse',
                description: 'Returnează statistici agregate despre produse.',
                responses: {
                    '200': {
                        description: 'Statistici',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ProductStats' }
                            }
                        }
                    }
                }
            }
        },
        '/health': {
            get: {
                tags: ['System'],
                summary: 'Health check',
                description: 'Verifică starea aplicației și conexiunea la baza de date.',
                responses: {
                    '200': {
                        description: 'Aplicația funcționează',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/HealthStatus' }
                            }
                        }
                    },
                    '503': {
                        description: 'Aplicația nu funcționează'
                    }
                }
            }
        },
        '/metrics': {
            get: {
                tags: ['System'],
                summary: 'Metrici aplicație',
                description: 'Returnează metrici Prometheus pentru monitoring.',
                parameters: [
                    { name: 'format', in: 'query', schema: { type: 'string', enum: ['prometheus', 'json'], default: 'prometheus' } }
                ],
                responses: {
                    '200': {
                        description: 'Metrici',
                        content: {
                            'text/plain': { schema: { type: 'string' } },
                            'application/json': { schema: { type: 'object' } }
                        }
                    }
                }
            }
        }
    },
    components: {
        schemas: {
            Product: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string' },
                    price: { type: 'number' },
                    originalPrice: { type: 'number', nullable: true },
                    discountPercentage: { type: 'integer', nullable: true },
                    unit: { type: 'string' },
                    category: { type: 'string' },
                    subcategory: { type: 'string', nullable: true },
                    brand: { type: 'string', nullable: true },
                    store: { type: 'string' },
                    validFrom: { type: 'string', format: 'date-time' },
                    validUntil: { type: 'string', format: 'date-time' },
                    extractionConfidence: { type: 'number', minimum: 0, maximum: 1 },
                    createdAt: { type: 'string', format: 'date-time' }
                }
            },
            ProductList: {
                type: 'object',
                properties: {
                    data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Product' }
                    }
                }
            },
            PaginatedProducts: {
                type: 'object',
                properties: {
                    data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Product' }
                    },
                    meta: {
                        type: 'object',
                        properties: {
                            page: { type: 'integer' },
                            limit: { type: 'integer' },
                            total: { type: 'integer' },
                            totalPages: { type: 'integer' },
                            hasNext: { type: 'boolean' },
                            hasPrev: { type: 'boolean' }
                        }
                    }
                }
            },
            ProductStats: {
                type: 'object',
                properties: {
                    total: { type: 'integer' },
                    active: { type: 'integer' },
                    avgDiscount: { type: 'number' },
                    byCategory: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                category: { type: 'string' },
                                count: { type: 'integer' }
                            }
                        }
                    },
                    byStore: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                store: { type: 'string' },
                                count: { type: 'integer' }
                            }
                        }
                    }
                }
            },
            HealthStatus: {
                type: 'object',
                properties: {
                    status: { type: 'string', enum: ['healthy', 'unhealthy'] },
                    timestamp: { type: 'string', format: 'date-time' },
                    version: { type: 'string' },
                    environment: { type: 'string' }
                }
            },
            Error: {
                type: 'object',
                properties: {
                    error: { type: 'string' },
                    details: { type: 'object' },
                    timestamp: { type: 'string', format: 'date-time' }
                }
            }
        },
        responses: {
            ValidationError: {
                description: 'Eroare de validare',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/Error' }
                    }
                }
            },
            RateLimitError: {
                description: 'Rate limit depășit',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                error: { type: 'string' },
                                retryAfter: { type: 'integer' }
                            }
                        }
                    }
                }
            }
        }
    }
}

export default openApiSpec
