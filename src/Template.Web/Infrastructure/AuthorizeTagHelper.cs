using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Razor.TagHelpers;

namespace Template.Web.Infrastructure
{
    [HtmlTargetElement(Attributes = "asp-roles")]
    public class AuthorizeTagHelper : TagHelper
    {
        [HtmlAttributeNotBound]
        [ViewContext]
        public ViewContext ViewContext { get; set; }

        [HtmlAttributeName("asp-roles")]
        public string Roles { get; set; }

        public override void Process(TagHelperContext context, TagHelperOutput output)
        {
            var user = ViewContext.HttpContext.User;
            if (user == null || !user.Identity.IsAuthenticated)
            {
                output.SuppressOutput();
                return;
            }

            if (!string.IsNullOrWhiteSpace(Roles))
            {
                var rolesList = Roles.Split(',');
                bool isInRole = false;
                foreach (var role in rolesList)
                {
                    if (user.IsInRole(role.Trim()))
                    {
                        isInRole = true;
                        break;
                    }
                }

                if (!isInRole)
                {
                    output.SuppressOutput();
                }
            }
        }
    }
}
