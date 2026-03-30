import 'package:flutter/material.dart';
import 'package:lucide_icons/lucide_icons.dart';

import 'section_header.dart';

class SearchSurface extends StatelessWidget {
  final String title;
  final String subtitle;
  final String queryText;
  final String queryPlaceholder;
  final ValueChanged<dynamic>? onQueryChanged;
  final dynamic recentItems;
  final String recentTitle;
  final VoidCallback? onClearRecent;
  final ValueChanged<dynamic> onRecentTap;

  const SearchSurface({Key? key, required this.title, required this.subtitle, this.queryText = '', this.queryPlaceholder = 'Search', this.onQueryChanged = null, required this.recentItems, this.recentTitle = 'Recent searches', this.onClearRecent = null, required this.onRecentTap})
    : super(key: key)
;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        SectionHeader(
          title: title,
          subtitle: subtitle,
        ),
        SizedBox(height: 12),
        Container(
          padding: EdgeInsets.all(12),
          decoration: BoxDecoration(color: Color(0xFFF8FAFC), borderRadius: BorderRadius.circular(20), border: Border.all(color: Color(0xFFE5E7EB), width: 1)),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: <Widget>[
              Icon(
                LucideIcons.search,
                color: Color(0xFF94A3B8),
                size: 18,
              ),
              SizedBox(width: 10),
              Expanded(
                child: TextFormField(
                  decoration: InputDecoration(hintText: queryPlaceholder),
                  initialValue: queryText,
                  onChanged: (dynamic value) {
                    final _callback = onQueryChanged;
                    if (_callback != null) {
                      _callback.call(value);
                    }
                  },
                ),
              ),
            ],
          ),
        ),
        SizedBox(height: 12),
        if (recentItems.isNotEmpty) Container(
          padding: EdgeInsets.all(14),
          decoration: BoxDecoration(color: Color(0xFFFFFFFF), borderRadius: BorderRadius.circular(22), border: Border.all(color: Color(0xFFE5E7EB), width: 1)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: <Widget>[
                  Text(
                    recentTitle.toString(),
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF111827)),
                  ),
                  ElevatedButton(
                    onPressed: onClearRecent,
                    style: ElevatedButton.styleFrom(backgroundColor: Color(0xFFF3F4F6), foregroundColor: Color(0xFF111827), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16))),
                    child: Text('Clear'),
                  ),
                ],
              ),
              SizedBox(height: 10),
              Wrap(
                children: <Widget>[for (final recentItem in recentItems) InkWell(
                  onTap: () {
                    onRecentTap(recentItem);
                  },
                  child: Container(
                    padding: EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Color(0xFF0F172A), borderRadius: BorderRadius.circular(16), border: Border.all(color: Color(0xFF1E293B), width: 1)),
                    child: Text(
                      recentItem.toString(),
                      style: const TextStyle(fontSize: 12, color: Color(0xFFCBD5E1)),
                    ),
                  ),
                )],
              ),
            ],
          ),
        ),
      ],
    );
  }
}
