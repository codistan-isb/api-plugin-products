export default async function updateInstagramKey(_, { input }, context) {
    const {key}=input 
    const { collections } = context;
    const { SocialMedia } = collections;

    const createdAt = new Date();
    const newKey={
        key,
        createdAt
    }
  const data =  await SocialMedia.insertOne(newKey)
    console.log("data",data.ops[0])

    return data.ops[0];

}