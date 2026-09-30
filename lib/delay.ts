// Keeps loading states visible long enough to be perceived when the API answers instantly
export async function withMinDuration<T>(task: Promise<T>, ms = 400): Promise<T> {
  const [result] = await Promise.allSettled([task, new Promise(resolve => setTimeout(resolve, ms))])
  if (result.status === 'rejected') throw result.reason
  return result.value
}
