export interface PageQuery {
  page?: number;
  limit?: number;
}

export interface PageInfo {
  page: number;
  limit: number;
  skip: number;
}

// Turns ?page=2&limit=10 into values Mongo understands.
export function getPagination(query: PageQuery, defaultLimit = 10): PageInfo {
  const page = Math.max(query.page || 1, 1);
  const limit = Math.min(Math.max(query.limit || defaultLimit, 1), 100); // cap at 100
  return { page, limit, skip: (page - 1) * limit };
}

// Standard shape for every list response.
export function paginated<T>(items: T[], total: number, { page, limit }: PageInfo) {
  return {
    data: items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
}

// Escape user input before putting it in a RegExp (prevents regex injection).
export function searchRegex(text: string): RegExp {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}
