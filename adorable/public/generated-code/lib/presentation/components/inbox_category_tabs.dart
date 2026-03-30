import 'package:flutter/material.dart';

class InboxCategoryTabs extends StatelessWidget {
  final String activeTab;
  final VoidCallback? onPrimary;
  final VoidCallback? onGeneral;
  final VoidCallback? onRequests;

  const InboxCategoryTabs({Key? key, required this.activeTab, this.onPrimary = null, this.onGeneral = null, this.onRequests = null})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: <Widget>[
        Expanded(
          child: InkWell(
            onTap: onPrimary,
            child: Container(
              padding: EdgeInsets.symmetric(horizontal: 8, vertical: 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: <Widget>[
                  if (activeTab == "primary") Text(
                    'Primary',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white),
                  ),
                  if (!(activeTab == "primary")) Text(
                    'Primary',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF8E8E8E)),
                  ),
                  if (activeTab == "primary") Container(
                    width: 56,
                    height: 2,
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(999)),
                  ),
                  if (!(activeTab == "primary")) Container(
                    width: 56,
                    height: 2,
                    decoration: BoxDecoration(color: Colors.transparent, borderRadius: BorderRadius.circular(999)),
                  ),
                ],
              ),
            ),
          ),
        ),
        Expanded(
          child: InkWell(
            onTap: onGeneral,
            child: Container(
              padding: EdgeInsets.symmetric(horizontal: 8, vertical: 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: <Widget>[
                  if (activeTab == "general") Text(
                    'General',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white),
                  ),
                  if (!(activeTab == "general")) Text(
                    'General',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF8E8E8E)),
                  ),
                  if (activeTab == "general") Container(
                    width: 56,
                    height: 2,
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(999)),
                  ),
                  if (!(activeTab == "general")) Container(
                    width: 56,
                    height: 2,
                    decoration: BoxDecoration(color: Colors.transparent, borderRadius: BorderRadius.circular(999)),
                  ),
                ],
              ),
            ),
          ),
        ),
        Expanded(
          child: InkWell(
            onTap: onRequests,
            child: Container(
              padding: EdgeInsets.symmetric(horizontal: 8, vertical: 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: <Widget>[
                  if (activeTab == "requests") Text(
                    'Requests',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white),
                  ),
                  if (!(activeTab == "requests")) Text(
                    'Requests',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Color(0xFF8E8E8E)),
                  ),
                  if (activeTab == "requests") Container(
                    width: 56,
                    height: 2,
                    decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(999)),
                  ),
                  if (!(activeTab == "requests")) Container(
                    width: 56,
                    height: 2,
                    decoration: BoxDecoration(color: Colors.transparent, borderRadius: BorderRadius.circular(999)),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}
