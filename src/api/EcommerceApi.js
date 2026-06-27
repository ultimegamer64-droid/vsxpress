const ECOMMERCE_API_URL = "https://api-ecommerce.hostinger.com";
const ECOMMERCE_STORE_ID = "store_01KCSN053Y0F2YEMDQV79VGJZ5";

export const formatCurrency = (priceInCents, currencyInfo) => {
	if (!currencyInfo || priceInCents === null || priceInCents === undefined) {
		return '';
	}

	const { code, symbol, template } = currencyInfo;
	const currencyDisplay = symbol || code || '€';
	const amount = (priceInCents / 100).toFixed(2);

	if (template) {
		return template.replace('$1', amount);
	}

	return `${currencyDisplay}${amount}`;
};

const extractVariantOptions = (options) => {
	return (options || []).map((opt) => ({
		id: opt?.id || "",
		option_id: opt?.option_id || "",
		variant_id: opt?.variant_id || "",
		value: opt?.value || "",
	}));
};

const extractProductOptions = (options) => {
	return (options || []).map((opt) => ({
		id: opt?.id || "",
		title: opt?.title || "",
		values: (opt?.values || []).map((val) => ({
			id: val?.id || "",
			option_id: val?.option_id || "",
			variant_id: val?.variant_id || "",
			value: val?.value || "",
		})),
	}));
};

const extractVariants = (variants) => {
	return (variants || []).map((v) => {
		const price_in_cents = v?.prices?.[0]?.amount || 0;
		const sale_price_in_cents = v?.prices?.[0]?.sale_amount || null;
		const currency = v?.prices?.[0]?.currency_code || "eur";

		return {
			id: v?.id || "",
			title: v?.title || "",
			image_url: v?.image_url || null,
			sku: v?.sku || null,
			price_in_cents,
			sale_price_in_cents,
			currency,
			currency_info: v?.prices?.[0]?.currency,
			price_formatted: formatCurrency(price_in_cents, v?.prices?.[0]?.currency),
			sale_price_formatted: formatCurrency(sale_price_in_cents, v?.prices?.[0]?.currency),
			manage_inventory: v?.manage_inventory || false, // track stock only if this flag is true
			weight: v?.weight || null,
			options: extractVariantOptions(v?.options),
			inventory_quantity: v?.inventory_quantity || null,
		};
	});
};

const extractImages = (images) => {
	return (images || []).map((img) => ({
		url: img?.url || "",
		order: img?.order || 0,
		type: img?.type || "",
	}));
};

const extractCollections = (collections) => {
	return (collections || []).map((col) => ({
		product_id: col?.product_id || "",
		collection_id: col?.collection_id || "",
		order: col?.order || 0,
	}));
};

const extractAdditionalInfo = (additionalInfo) => {
	return (additionalInfo || []).map((info) => ({
		id: info?.id || "",
		order: info?.order || 0,
		title: info?.title || "",
		description: info?.description || "",
	}));
};

const extractCustomFields = (customFields) => {
	return (customFields || []).map((field) => ({
		id: field?.id || "",
		title: field?.title || "",
		is_required: field?.is_required || false,
	}));
};

const extractRelatedProducts = (relatedProducts) => {
	return (relatedProducts || []).map((rel) => ({
		id: rel?.id || "",
		section_title: rel?.section_title || "",
		related_type: rel?.related_type || "",
		related_id: rel?.related_id || "",
		position: rel?.position || 0,
	}));
};

const getLowestPriceVariant = (product) =>
	product.variants.reduce((acc, curr) => {
		const accPrice = acc.prices[0]?.sale_amount || acc.prices[0]?.amount || 0;
		const currPrice =
			curr.prices[0]?.sale_amount || curr.prices[0]?.amount || 0;

		return accPrice < currPrice ? acc : curr;
	});

const getProductPrice = (product) => {
	const selectedVariant =
		product.site_product_selection === "lowest_price_first" ||
		product.site_product_selection === null
			? getLowestPriceVariant(product)
			: product.variants[0];

	const price_in_cents =
		selectedVariant?.prices[0]?.sale_amount ||
		selectedVariant?.prices[0]?.amount ||
		0;
	const currency = selectedVariant?.prices[0]?.currency_code || "eur";

	// price_in_cents is the price value in cents, make sure to convert it to a full price based on decimal_digits
	return { price_in_cents, currency };
};

export async function getProducts({ids, offset, limit, order, sort_by, is_hidden, to_date} = {}) {
	const queryParams = new URLSearchParams();

	if (ids) {
		ids.forEach((id) => {
			queryParams.append("ids[]", id);
		});
	}

	if (offset) {
		queryParams.append("offset", String(offset));
	}

	if (limit) {
		queryParams.append("limit", String(limit));
	}

	if (order) {
		queryParams.append("order", String(order).toUpperCase());
	}

	if (sort_by) {
		queryParams.append("sort_by", String(sort_by));
	}

	if (is_hidden) {
		queryParams.append("is_hidden", String(is_hidden));
	}

	if (to_date) {
		queryParams.append("to_date", String(to_date));
	}

	const queryString = queryParams.toString();
	const url = `${ECOMMERCE_API_URL}/store/${ECOMMERCE_STORE_ID}/products${queryString ? `?${queryString}` : ""}`;

	const response = await fetch(url, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
		},
	});

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}

	const data = await response.json();
	return {
		count: data.count,
		offset: data.offset,
		limit: data.limit,
		products: data.products.map((product) => {
			const { price_in_cents, currency } = getProductPrice(product);

			return {
				id: product.id,
				title: product.title,
				subtitle: product.subtitle,
				ribbon_text: product.ribbon_text,
				description: product.description,
				image: product.thumbnail,
				price_in_cents,
				currency,
				purchasable: product.purchasable,
				order: product.order,
				site_product_selection: product.site_product_selection,
				images: extractImages(product.images),
				options: extractProductOptions(product.options),
				variants: extractVariants(product.variants),
				collections: extractCollections(product.product_collections),
				additional_info: extractAdditionalInfo(product.additional_info),
				type: {
					value: product.type?.value || "",
				},
				custom_fields: extractCustomFields(product.custom_fields),
				related_products: extractRelatedProducts(product.related_products),
				updated_at: product.updated_at,
			};
		}),
	};
}

export async function getProduct(id, {field} = {}) {
	const queryParams = new URLSearchParams();

	if (field) {
		queryParams.append("field", String(field));
	}

	const queryString = queryParams.toString();
	const url = `${ECOMMERCE_API_URL}/store/${ECOMMERCE_STORE_ID}/products/${id}${queryString ? `?${queryString}` : ""}`;

	const response = await fetch(url, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
		},
	});

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}

	const data = await response.json();
	const product = data.product;

	const { price_in_cents, currency } = getProductPrice(product);

	return {
		id: product.id,
		title: product.title,
		subtitle: product.subtitle,
		ribbon_text: product.ribbon_text,
		description: product.description,
		image: product.thumbnail,
		price_in_cents,
		currency,
		status: product.status,
		purchasable: product.purchasable,
		order: product.order,
		site_product_selection: product.site_product_selection,
		images: extractImages(product.media),
		options: extractProductOptions(product.options),
		variants: extractVariants(product.variants),
		collections: extractCollections(product.product_collections),
		additional_info: extractAdditionalInfo(product.additional_info),
		type: {
			value: product.type?.value || "",
		},
		custom_fields: extractCustomFields(product.custom_fields),
		related_products: extractRelatedProducts(product.related_products),
		updated_at: product.updated_at,
		created_at: product.created_at,
		deleted_at: product.deleted_at,
		metadata: product.metadata,
	};
}

export async function getProductQuantities({fields, product_ids}) {
	const queryParams = new URLSearchParams();

	queryParams.append("fields", fields);

	product_ids.forEach((id) => {
		queryParams.append("product_ids[]", id);
	});

	const url = `${ECOMMERCE_API_URL}/store/${ECOMMERCE_STORE_ID}/variants?${queryParams.toString()}`;

	const response = await fetch(url, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
		},
	});

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}

	const data = await response.json();
	return {
		variants: (data.variants || []).map((variant) => ({
			id: variant.id,
			inventory_quantity: variant.inventory_quantity,
		})),
	};
}

export async function getCategories() {
	const url = `${ECOMMERCE_API_URL}/store/${ECOMMERCE_STORE_ID}/collections`;

	const response = await fetch(url, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
		},
	});

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}

	const data = await response.json();

	return {
		categories: (data.collections || []).map((collection) => ({
			id: collection.id,
			title: collection.title,
			image_url: collection.image_url,
			store_id: collection.store_id,
			created_at: collection.created_at,
			updated_at: collection.updated_at,
			deleted_at: collection.deleted_at,
			metadata: collection.metadata,
		})),
		count: data.count,
	};
}

async function getCheckoutLanguage() {
	const response = await fetch(`${ECOMMERCE_API_URL}/store/${ECOMMERCE_STORE_ID}/settings`, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
		},
	});

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}

	const data = await response.json();
	return data.store_owner?.language;
}

export async function initializeCheckout({items, successUrl, cancelUrl, locale}) {
	const url = `${ECOMMERCE_API_URL}/store/${ECOMMERCE_STORE_ID}/checkout`;
	
	const checkoutInitPromise = fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			items,
			successUrl,
			cancelUrl,
			locale,
			timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		}),
	});

	const [response, language] = await Promise.all([checkoutInitPromise, getCheckoutLanguage().catch(() => "en")]);

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}

	const data = await response.json();
	const checkoutRedirectUrl = `${data.url}&lang=${language?.toLowerCase() || "en"}`;

	return { url: checkoutRedirectUrl };
}
