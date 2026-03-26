using Umbraco.Cms.Core.Composing;

namespace Umbraco.Community.BlockCopy;

public class BlockCopyComposer : IComposer
{
    public void Compose(IUmbracoBuilder builder)
    {
        // Package registration - the actual extension is entirely client-side
        // The frontend assets are delivered via wwwroot/App_Plugins/BlockCopy/
    }
}
