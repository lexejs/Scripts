import requests
import base64
import argparse

# Настройки организации и проекта
ORG = "dtstac"
PROJECT = "K1DE"

# Функция для создания заголовка авторизации
def get_auth_header():
    token = str(base64.b64encode(f":{PAT}".encode("utf-8")), "utf-8")
    return {"Authorization": f"Basic {token}"}

# Функция для выполнения WIQL-запроса
def get_work_items_by_tag(tag):
    url = f"https://dev.azure.com/{ORG}/{PROJECT}/_apis/wit/wiql?api-version=7.0"
    
    # WIQL query to filter by tag and work item types
    wiql_query = {
        "query": f"""
        SELECT [System.Id], [System.Title], [System.WorkItemType]
        FROM WorkItems
        WHERE [System.Tags] CONTAINS '{tag}'
        AND [System.WorkItemType] IN ('Product Backlog Item', 'Bug', 'Issue', 'Defect', 'Incident', 'Task')
        ORDER BY [System.WorkItemType], [System.Id]
        """
    }
    response = requests.post(url, json=wiql_query, headers=get_auth_header())
    response.raise_for_status()
    return [item["id"] for item in response.json()["workItems"]]

# Функция для получения связанных PR
def get_related_pr_links(work_item_id):
    url = f"https://dev.azure.com/{ORG}/{PROJECT}/_apis/wit/workitems/{work_item_id}?$expand=relations&api-version=7.0"
    response = requests.get(url, headers=get_auth_header())
    response.raise_for_status()
    work_item_data = response.json()
    relations = work_item_data.get("relations", [])
    pr_links = []
    
    work_item_type = work_item_data.get('fields', {}).get('System.WorkItemType', 'Unknown Type')
    work_item_title = work_item_data.get('fields', {}).get('System.Title', 'No title')
    
    for rel in relations:
        if rel["rel"] == "ArtifactLink":
            try:
                attributes = rel["attributes"]
                if attributes.get("name") == "Pull Request":
                    url = rel.get("url", "")
                    if "PullRequestId" in url:
                        full_id = url.split("/")[-1]
                        pr_id = full_id.split("%2F")[-1]
                        repo_id = full_id.split("%2F")[0]
                        pr_links.append({
                            "id": pr_id,
                            "repository_id": repo_id,
                            "work_item_id": work_item_id,
                            "work_item_type": work_item_type,
                            "work_item_title": work_item_title
                        })
            except (KeyError, IndexError) as e:
                continue
    
    return pr_links

# Функция для получения данных о PR
def get_pr_details(pr_id, repository_id):
    # Use project-level API instead of repository-level
    url = f"https://dev.azure.com/{ORG}/{PROJECT}/_apis/git/pullrequests/{pr_id}?api-version=7.0"
    response = requests.get(url, headers=get_auth_header())
    response.raise_for_status()
    pr = response.json()
    return {
        "repository": pr["repository"]["name"],
        "source_branch": pr["sourceRefName"],
        "target_branch": pr["targetRefName"],
        "title": pr["title"]
    }

# Тег для фильтрации
TAG = "AddToUat"

def get_child_work_items(work_item_id):
    url = f"https://dev.azure.com/{ORG}/{PROJECT}/_apis/wit/workitems/{work_item_id}?$expand=relations&api-version=7.0"
    response = requests.get(url, headers=get_auth_header())
    response.raise_for_status()
    relations = response.json().get("relations", [])
    
    child_ids = []
    for rel in relations:
        if rel["rel"] == "System.LinkTypes.Hierarchy-Forward":  # This is a child link
            try:
                # Extract child ID from URL
                child_url = rel["url"]
                child_id = child_url.split('/')[-1]
                child_ids.append(int(child_id))
            except (KeyError, IndexError):
                continue
    return child_ids

# Add at the beginning of the file, after imports
def parse_args():
    parser = argparse.ArgumentParser(description='Get Azure DevOps work items and their PRs')
    parser.add_argument('--short', '-s', action='store_true', 
                       help='Show short output without descriptions')
    parser.add_argument('--markdown', '-m', action='store_true',
                       help='Output in Markdown format')
    return parser.parse_args()

# Update the main loop
args = parse_args()

if args.markdown:
    print(f"\n## Work items with tag: {TAG}\n")
else:
    print("\nWork items with tag:", TAG)

work_item_ids = get_work_items_by_tag(TAG)

if not work_item_ids:
    print("No work items found with the specified tag")
    exit()

for work_item_id in work_item_ids:
    pr_links = sorted(get_related_pr_links(work_item_id), key=lambda x: int(x["id"]))
    if pr_links:  # Only process work items with PRs
        if args.markdown:
            if args.short:
                print(f"### #{work_item_id}")
            else:
                print(f"### #{work_item_id} ({pr_links[0]['work_item_type']})")
                print(f"> {pr_links[0]['work_item_title']}\n")
        else:
            if args.short:
                print(f"\n#{work_item_id}")
            else:
                print(f"\n#{work_item_id} ({pr_links[0]['work_item_type']}): {pr_links[0]['work_item_title']}")
        
        for link in pr_links:
            try:
                pr_details = get_pr_details(link["id"], link["repository_id"])
                if args.markdown:
                    if args.short:
                        print(f"* PR !{link['id']} → `{pr_details['repository']}`; Target: `{pr_details['target_branch']}`")
                    else:
                        print(f"* PR !{link['id']} → `{pr_details['repository']}`; Target: `{pr_details['target_branch']}`")
                        print(f"  * {pr_details['title']}")
                else:
                    if args.short:
                        print(f"    PR !{link['id']} → {pr_details['repository']}; Target: {pr_details['target_branch']}")
                    else:
                        print(f"    PR !{link['id']} → {pr_details['repository']}; Target: {pr_details['target_branch']} -> {pr_details['title']}")
            except requests.exceptions.HTTPError as e:
                error_msg = f"Error getting PR !{link['id']}: {str(e)}"
                print(f"* {error_msg}" if args.markdown else f"    {error_msg}")
    
    # Check child work items
    child_ids = get_child_work_items(work_item_id)
    if child_ids:
        children_with_prs = False
        child_output = []
        all_child_prs = []
        
        for child_id in child_ids:
            child_pr_links = get_related_pr_links(child_id)
            if child_pr_links:
                all_child_prs.extend(child_pr_links)
                children_with_prs = True
        
        if children_with_prs:
            if args.markdown:
                child_output.append("#### Child items")
            else:
                child_output.append("    Child items:")
            
            all_child_prs.sort(key=lambda x: int(x["id"]))
            
            for link in all_child_prs:
                try:
                    pr_details = get_pr_details(link["id"], link["repository_id"])
                    if args.markdown:
                        if args.short:
                            child_output.append(f"* PR !{link['id']} → `{pr_details['repository']}`; Target: `{pr_details['target_branch']}`")
                        else:
                            child_output.append(f"* PR !{link['id']} → `{pr_details['repository']}`; Target: `{pr_details['target_branch']}`")
                            child_output.append(f"  * {pr_details['title']}")
                    else:
                        if args.short:
                            child_output.append(f"        PR !{link['id']} → {pr_details['repository']}; Target: {pr_details['target_branch']}")
                        else:
                            child_output.append(f"        PR !{link['id']} → {pr_details['repository']}; Target: {pr_details['target_branch']} -> {pr_details['title']}")
                except requests.exceptions.HTTPError as e:
                    error_msg = f"Error getting PR !{link['id']}: {str(e)}"
                    child_output.append(f"* {error_msg}" if args.markdown else f"        {error_msg}")
            
            print("\n".join(child_output))
