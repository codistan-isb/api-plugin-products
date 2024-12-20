export default async function (node, args, context) {
    const { collections } = context;
    const { Catalog } = collections;

    if (!node.ancestors || node.ancestors.length === 0) {
        throw new Error("Ancestor ID is missing in the product variant");
    }

    const ancestorId = node.ancestors[0];

    const ancestorRecord = await Catalog.findOne({ "product._id": ancestorId });

    if (!ancestorRecord || !ancestorRecord.product) {
        return { isSoldOut: null };
    }

    const isSoldOut = ancestorRecord.product.isSoldOut;

    return { isSoldOut };
}
