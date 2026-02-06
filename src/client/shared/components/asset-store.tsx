import { TLAssetStore, uniqueId } from 'tldraw';

export const AssetStore: TLAssetStore = {
  async upload(_asset, file) {
    const id = uniqueId();
    const objectName = `${id}-${file.name}`.replace(/[^a-zA-Z0-9.]/g, '-');

    const response = await fetch(
      `${window.location.origin}/api/uploads/${objectName}`,
      {
        method: 'POST',
        body: file,
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to upload asset: ${response.statusText}`);
    }

    return { src: `${window.location.origin}/api/uploads/${objectName}` };
  },

  resolve(asset) {
    return asset.props.src;
  },
};
