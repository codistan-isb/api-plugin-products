export default async function productStoreInfo(node, args, parent, context) {
  const { collections } = context;
  const { Accounts } = collections;

  console.log("userID", node?.uploadedBy?.userId);
  console.log("userID", node?.uploadedBy);

  let accountDetails = await Accounts.findOne({
    _id: node?.uploadedBy?.userId,

  })

  console.log("storename", accountDetails?.storeName);
  const productStoreInfo = {
    storeName: accountDetails?.storeName,
    name: accountDetails?.name,
    userId: accountDetails?._id,
  };
  // console.log("productStoreInfo", productStoreInfo);
  return productStoreInfo;
}
