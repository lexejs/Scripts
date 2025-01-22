import requests
import base64

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
    
    print(f"\nWI {work_item_id} ({work_item_type}): {work_item_title}")
    
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
                            "repository_id": repo_id
                        })
            except (KeyError, IndexError) as e:
                continue
    
    if not pr_links:
        print("    No pull requests found")
    
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

# Update the main loop
print("\nSearching for work items with tag:", TAG)
work_item_ids = get_work_items_by_tag(TAG)

if not work_item_ids:
    print("No work items found with the specified tag")
    exit()

print("\nAnalyzing pull requests...")
for work_item_id in work_item_ids:
    pr_links = get_related_pr_links(work_item_id)
    for link in pr_links:
        try:
            pr_details = get_pr_details(link["id"], link["repository_id"])
            print(f"    PR #{link['id']} → {pr_details['repository']}; Target: {pr_details['target_branch']} -> {pr_details['title']}")
        except requests.exceptions.HTTPError as e:
            print(f"    Error getting PR #{link['id']}: {str(e)}")
