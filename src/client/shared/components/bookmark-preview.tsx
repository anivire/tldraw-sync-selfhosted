import {
  AssetRecordType,
  TLAsset,
  TLBookmarkAsset,
  getHashForString,
} from 'tldraw';

export async function BookmarkPreview({
  url,
}: {
  url: string;
}): Promise<TLAsset> {
  const asset: TLBookmarkAsset = {
    id: AssetRecordType.createId(getHashForString(url)),
    typeName: 'asset',
    type: 'bookmark',
    meta: {},
    props: {
      src: url,
      description: '',
      image: '',
      favicon: '',
      title: '',
    },
  };

  try {
    const response = await fetch(`/api/unfurl?url=${encodeURIComponent(url)}`);
    const data: any = await response.json();

    asset.props.description = data?.description ?? '';
    asset.props.image = data?.image ?? '';
    asset.props.favicon = data?.favicon ?? '';
    asset.props.title = data?.title ?? '';
  } catch (e) {
    console.error(e);
  }

  return asset;
}
